const axios = require("axios");
const Analysis = require("./models/Analysis");
const { selectRepository, getInternationalLawsForCountries } = require("./legalRepository");
const { buildPrompt } = require("./promptBuilder");
const { callGemini, parseModelJson } = require("./geminiClient");
const { consume, AI_ANALYSIS_QUEUE } = require("/app/shared/rabbitmq");
const { recordAudit } = require("/app/shared/audit");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";
const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || "http://risk-compliance-service:4004";

function generateFallbackAnalysis(text, userCountry, employerCountry, clientCountry, contractType) {
  const companyCountry = employerCountry || userCountry || "India";
  const isBidding = contractType === "bidding";
  const isMou = contractType === "mou";
  const cleanText = text || "";
  
  // 1. DYNAMIC DATE EXTRACTION: Find all dates (explicit, dot-separated, relative) and surrounding sentence context
  const datePattern = /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z.]*\s+\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b|\b\d{1,3}\s+(?:days|months|weeks|years)\b/gi;
  
  const extractedDeadlines = [];
  let detectedOpeningDate = null;
  
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  const matchedDates = new Set();
  
  sentences.forEach((sentence) => {
    const datesInSentence = sentence.match(datePattern);
    if (datesInSentence) {
      datesInSentence.forEach((dateStr) => {
        if (!matchedDates.has(dateStr)) {
          matchedDates.add(dateStr);
          const lowerSentence = sentence.toLowerCase();
          
          let title = "Important Milestone / Date";
          if (lowerSentence.includes("opening") || lowerSentence.includes("open")) {
            title = "Bid Opening Date";
            if (!detectedOpeningDate) detectedOpeningDate = dateStr;
          } else if (lowerSentence.includes("submission") || lowerSentence.includes("submit") || lowerSentence.includes("closing") || lowerSentence.includes("deadline") || lowerSentence.includes("due")) {
            title = "Bid Submission Deadline";
          } else if (lowerSentence.includes("effective") || lowerSentence.includes("commence") || lowerSentence.includes("start")) {
            title = "Effective / Commencement Date";
          } else if (lowerSentence.includes("expiry") || lowerSentence.includes("end") || lowerSentence.includes("termination") || lowerSentence.includes("notice")) {
            title = "Termination / Notice Period";
          } else if (lowerSentence.includes("clarification") || lowerSentence.includes("query")) {
            title = "Clarification Deadline";
          } else if (lowerSentence.includes("pre-bid") || lowerSentence.includes("meeting")) {
            title = "Pre-Bid Meeting Date";
          }
          
          extractedDeadlines.push({
            title,
            date: dateStr,
            description: sentence.trim().slice(0, 180)
          });
        }
      });
    }
  });

  // Guarantee key dates availability for all contracts
  if (extractedDeadlines.length === 0) {
    extractedDeadlines.push({
      title: "Notice & Termination Window",
      date: "30 days",
      description: "Standard statutory termination notice period applicable unless explicitly altered by mutual written consent."
    });
    extractedDeadlines.push({
      title: "Tender / Proposal Validity",
      date: "90 days",
      description: "Standard bid validity timeframe for proposal evaluation and contract award confirmation."
    });
  }

  // 2. DYNAMIC LAW & REGULATION EXTRACTION & MULTILINGUAL SECTION CATEGORIZATION
  const lawPattern = /\b(?:[A-ZÄÖÜŠŽa-zäöüšž0-9\s&,.-]{2,45}\s(?:Act|Regulation|Directive|Statute|Code|Decree|Law|Rules|Ordinance|Seadus|Määrus|Gesetz|Verordnung|Direktiiv|Direktiv|Loi|Ley|Decreto|Codice)|Section\s+\d+|Article\s+\d+|§\s*\d+|Riigihangete\s+seadus|Juhised\s+[a-z]+|GDPR|HIPAA|FAR\s+Part\s+\d+)\b/gi;
  const foundLawMatches = cleanText.match(lawPattern) || [];
  
  // Clean leading noise words or paragraph numbers
  const uniqueLaws = Array.from(new Set(foundLawMatches.map(l => {
    return l.replace(/^[^A-ZÄÖÜŠŽa-zäöüšž]+/, "")
            .replace(/^(?:and|or|the|under|with|for|by|in|to|of|a|an)\s+/i, "")
            .replace(/^\d+[\s.-]*/, "")
            .trim();
  }))).filter(l => l.length > 3 && !l.includes("\n") && !l.includes("\r"));
  
  const governingLawSentences = sentences.filter(s => {
    const l = s.toLowerCase();
    return l.includes("governed by") || l.includes("jurisdiction of") || l.includes("laws of") || l.includes("subject to the courts") || l.includes("seadus") || l.includes("gesetz");
  });
  
  const corporateLaws = [];
  const biddingLaws = [];
  
  uniqueLaws.forEach(lawName => {
    const lower = lawName.toLowerCase();
    if (lower.includes("procurement") || lower.includes("tender") || lower.includes("bidding") || lower.includes("public") || lower.includes("riigihange") || lower.includes("pakkujat") || lower.includes("vergabe")) {
      biddingLaws.push({
        lawName: lawName,
        description: `Governs public procurement transparency, tender submission, non-discrimination, and bidding evaluation under ${companyCountry}.`
      });
    } else {
      corporateLaws.push({
        lawName: lawName,
        description: `Applies to entity capacity, corporate governance, commercial obligations, and statutory enforceability under ${companyCountry}.`
      });
    }
  });
  
  // Guarantee complete statutory laws list for corporate governance
  if (corporateLaws.length === 0) {
    const govText = governingLawSentences[0] || `Governed by the statutory commercial and civil code of ${companyCountry}.`;
    corporateLaws.push({
      lawName: `Commercial Code & Corporate Governance Act of ${companyCountry}`,
      description: govText.trim().slice(0, 220)
    });
    corporateLaws.push({
      lawName: `Civil Obligations & Contract Law of ${companyCountry}`,
      description: `Governs validity of agreement, offer and acceptance, breach remedies, and statutory indemnities.`
    });
  }
  
  // Guarantee complete statutory laws list for bidding and public tender documents
  if (isBidding || cleanText.toLowerCase().includes("juhised") || cleanText.toLowerCase().includes("pakkujat") || cleanText.toLowerCase().includes("tender")) {
    if (!biddingLaws.some(l => l.lawName.toLowerCase().includes("procurement") || l.lawName.toLowerCase().includes("riigihange"))) {
      biddingLaws.push({
        lawName: `Public Procurement & Tender Act (Riigihangete seadus) of ${companyCountry}`,
        description: `Mandates transparent tender evaluation, equal treatment of bidders, and statutory security rules.`
      });
      biddingLaws.push({
        lawName: `European Public Procurement Directive (2014/24/EU)`,
        description: `Sets international standards for cross-border public procurement and tender documentation.`
      });
    }
  }

  // Dynamically invoke international & country-specific laws based on user's imported country selections
  const countryLaws = getInternationalLawsForCountries([userCountry, employerCountry, clientCountry]);
  countryLaws.forEach(lawObj => {
    if (!corporateLaws.some(l => l.lawName === lawObj.lawName) && !biddingLaws.some(l => l.lawName === lawObj.lawName)) {
      corporateLaws.push(lawObj);
    }
  });

  // 3. DYNAMIC REQUIREMENT & CLAUSE EXTRACTION
  const clauses = [];
  const biddingRequirements = [];
  const risks = [];
  const complianceIssues = [];

  sentences.forEach(s => {
    const l = s.toLowerCase();
    
    if (isBidding && (l.includes("emd") || l.includes("earnest money") || l.includes("security deposit") || l.includes("turnover") || l.includes("qualification") || l.includes("experience") || l.includes("net worth"))) {
      let title = "Bidding Qualification Requirement";
      if (l.includes("emd") || l.includes("earnest money") || l.includes("security deposit")) title = "Earnest Money Deposit (EMD) / Security";
      else if (l.includes("turnover") || l.includes("net worth") || l.includes("financial")) title = "Financial Qualification Criteria";
      else if (l.includes("experience")) title = "Technical & Past Experience Criteria";
      
      biddingRequirements.push({
        title,
        description: s.trim().slice(0, 220)
      });
    }
    
    if (l.includes("confidential") || l.includes("proprietary") || l.includes("non-disclosure")) {
      if (!clauses.some(c => c.category === "Confidentiality")) {
        clauses.push({ title: "Confidentiality & Non-Disclosure", text: s.trim().slice(0, 300), category: "Confidentiality" });
      }
    } else if (l.includes("terminate") || l.includes("termination") || l.includes("cancellation")) {
      if (!clauses.some(c => c.category === "Termination")) {
        clauses.push({ title: "Termination & Notice Period", text: s.trim().slice(0, 300), category: "Termination" });
      }
    } else if (l.includes("liab") || l.includes("indemn") || l.includes("damages")) {
      if (!clauses.some(c => c.category === "Liability")) {
        clauses.push({ title: "Liability & Indemnification", text: s.trim().slice(0, 300), category: "Liability" });
      }
    } else if (l.includes("payment") || l.includes("fee") || l.includes("price") || l.includes("invoice")) {
      if (!clauses.some(c => c.category === "Payment")) {
        clauses.push({ title: "Payment Terms & Milestones", text: s.trim().slice(0, 300), category: "Payment" });
      }
    }
  });

  if (isBidding && biddingRequirements.length === 0) {
    biddingRequirements.push({
      title: "Earnest Money Deposit (EMD) / Security",
      description: "Check tender document specifications for required EMD or bid security percentage."
    });
    biddingRequirements.push({
      title: "Technical & Financial Eligibility Criteria",
      description: "Provide audited financial statements and past experience credentials as specified in the tender."
    });
  }

  if (isMou && clauses.length === 0) {
    clauses.push({
      title: "Legally Non-Binding Statement of Intent",
      text: "The parties agree that this Memorandum of Understanding represents their mutual understanding and cooperation intent, and does not create legally binding obligations except where explicitly agreed.",
      category: "Binding Status"
    });
  }

  if (clauses.length === 0) {
    clauses.push({
      title: "Governing Law & Jurisdiction",
      text: governingLawSentences[0] || `This agreement is subject to the exclusive jurisdiction and laws of ${companyCountry}.`,
      category: "Jurisdiction"
    });
  }

  // 4. SUMMARY GENERATION WITH MAXIMUM DATA (LAWS, DATES, CLAUSES, OBLIGATIONS)
  const allLawItems = Array.from(new Set([...corporateLaws.map(l => l.lawName), ...biddingLaws.map(l => l.lawName)]));
  const bulletedLawsText = allLawItems.map(l => `• **${l}**`).join("\n");
  
  const clausesDetail = clauses.map(c => `• **${c.title}**: ${c.text}`).join("\n");
  const reqsDetail = biddingRequirements.map(r => `• **${r.title}**: ${r.description}`).join("\n");
  const datesDetail = extractedDeadlines.map(d => `• **${d.title}**: **${d.date}** — ${d.description}`).join("\n");
  const firstContext = sentences.slice(0, 4).join(" ").trim();

  let summaryParts = [];
  
  summaryParts.push(`DOCUMENT OVERVIEW & JURISDICTION:\nAnalyzed under the legal repository of **${companyCountry}**.\n\nDocument Context:\n${firstContext}`);

  summaryParts.push(`APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:\nThe following statutory laws, regulations, and international conventions govern this agreement:\n${bulletedLawsText}`);

  if (extractedDeadlines.length > 0) {
    summaryParts.push(`CRITICAL DATES & TIMELINE MILESTONES:\n${datesDetail}`);
  } else {
    summaryParts.push(`CRITICAL DATES:\nNo specific fixed calendar deadlines were identified in the extracted text.`);
  }

  if (clauses.length > 0) {
    summaryParts.push(`KEY OBLIGATIONS & CONTRACT TERMS:\n${clausesDetail}`);
  }

  if (isBidding && biddingRequirements.length > 0) {
    summaryParts.push(`BIDDING & ELIGIBILITY REQUIREMENTS:\n${reqsDetail}`);
  }

  const summary = summaryParts.join("\n\n");

  return {
    detectedLanguage: "English",
    summary,
    clauses,
    risks: risks.length > 0 ? risks : [
      {
        title: "Commercial Risk Exposure",
        description: "Verify all liability caps and notice timelines before signature.",
        severity: "MEDIUM"
      }
    ],
    complianceIssues: complianceIssues.length > 0 ? complianceIssues : [
      {
        title: "Statutory Compliance Audit",
        description: `Verify registration and corporate filing compliance under the laws of ${companyCountry}.`,
        regulationReference: corporateLaws[0]?.lawName || `Commercial Code of ${companyCountry}`
      }
    ],
    biddingLaws,
    biddingRequirements,
    corporateLaws,
    biddingDeadlines: extractedDeadlines,
    bidOpeningDate: detectedOpeningDate || (extractedDeadlines[0] ? extractedDeadlines[0].date : null),
    favorability: {
      userPercentage: 50,
      oppositePercentage: 50,
      userRationale: "Based on local statutory regulations, the baseline contract maintains a balanced structure. Review specific liability caps and indemnities to verify standard commercial safety.",
      oppositeRationale: "Standard obligations apply. Review payment milestones and dispute resolution clauses to ensure adequate protection against potential opposite side defaults."
    }
  };
}

// Full AI pipeline, triggered off the queue:
// text -> country detection (already supplied) -> legal repository selection ->
// prompt builder -> Gemini API -> post-processing -> risk/compliance engine -> MongoDB -> notify
async function handleAnalysisJob(job) {
  const { contractId, ownerId, text, image, userCountry, employerCountry, clientCountry, contractType } = job;
  const isBidding = contractType === "bidding";

  const legalRepository = selectRepository([userCountry, employerCountry, clientCountry]);
  let prompt = "";
  let parsed = null;

  if (isBidding) {
    try {
      const BIDDING_SERVICE_URL = process.env.BIDDING_SERVICE_URL || "http://bidding-service:4009";
      const { data } = await axios.post(`${BIDDING_SERVICE_URL}/analyze`, {
        text,
        userCountry,
        employerCountry,
        clientCountry,
      });
      if (data.success) {
        parsed = data.data;
        parsed.__raw = JSON.parse(JSON.stringify(data.data));
        prompt = `Bidding Analysis via Python Service under ${legalRepository}`;
      } else {
        throw new Error(data.error || "Bidding analysis service returned success=false");
      }
    } catch (err) {
      console.error("Bidding analysis via python-service failed, falling back to standard analysis:", err.message);
    }
  }

  // Fallback to standard if not bidding or if python call failed
  if (!parsed) {
    prompt = buildPrompt({ text, userCountry, employerCountry, clientCountry, legalRepository, contractType });
    try {
      const { text: modelText, raw } = await callGemini(prompt, image, 1, { temperature: 0.1, responseMimeType: "application/json" });
      parsed = parseModelJson(modelText);
      parsed.__raw = raw;
    } catch (err) {
      console.warn("Gemini call failed, falling back to local rule-based analysis:", err.message);
      parsed = generateFallbackAnalysis(text, userCountry, employerCountry, clientCountry, contractType);
      parsed.__raw = { fallbackReason: err.message };
    }
  }

  // Ensure ALL international & country-specific laws for userCountry, employerCountry, and clientCountry are merged in
  const countryLaws = getInternationalLawsForCountries([userCountry, employerCountry, clientCountry]);
  parsed.corporateLaws = parsed.corporateLaws || [];
  parsed.biddingLaws = parsed.biddingLaws || [];

  countryLaws.forEach(lawObj => {
    if (!parsed.corporateLaws.some(l => l.lawName === lawObj.lawName) && !parsed.biddingLaws.some(l => l.lawName === lawObj.lawName)) {
      parsed.corporateLaws.push(lawObj);
    }
  });

  // Guarantee executive summary includes APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:
  if (parsed.summary && !parsed.summary.includes("APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:")) {
    const allLawItems = Array.from(new Set([...parsed.corporateLaws.map(l => l.lawName), ...parsed.biddingLaws.map(l => l.lawName)]));
    const bulletedLawsText = allLawItems.map(l => `• **${l}**`).join("\n");
    parsed.summary = `APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:\nThe following statutory laws, regulations, and international conventions govern this agreement:\n${bulletedLawsText}\n\n` + parsed.summary;
  }

  const analysis = await Analysis.create({
    contract: contractId,
    owner: ownerId,
    legalRepository,
    detectedLanguage: parsed.detectedLanguage || "English",
    summary: parsed.summary,
    clauses: parsed.clauses || [],
    contractType: contractType || "standard",
    biddingLaws: parsed.biddingLaws || [],
    biddingRequirements: parsed.biddingRequirements || [],
    corporateLaws: parsed.corporateLaws || [],
    biddingDeadlines: parsed.biddingDeadlines || [],
    bidOpeningDate: parsed.bidOpeningDate || null,
    favorability: parsed.favorability || {
      userPercentage: 50,
      oppositePercentage: 50,
      userRationale: "Standard balanced terms under the applicable legal repository framework.",
      oppositeRationale: "Standard obligations and timelines apply to both contract parties."
    },
    rawModelResponse: parsed.__raw,
    promptUsed: prompt,
    status: "COMPLETED",
  });

  // Link back to the contract via REST (CRUD -> REST, per requirements)
  await axios.post(`${CONTRACT_SERVICE_URL}/api/contracts/internal/link-analysis`, {
    contractId,
    aiAnalysisId: analysis._id,
  });

  // Hand off risk + compliance detection to risk-compliance-service via REST
  await axios.post(`${RISK_SERVICE_URL}/api/risk/internal/generate`, {
    contractId,
    ownerId,
    analysisId: analysis._id,
    risks: parsed.risks || [],
    complianceIssues: parsed.complianceIssues || [],
  });

  await recordAudit({ userId: ownerId, action: "AI_ANALYSIS", status: "SUCCESS", meta: { contractId, analysisId: analysis._id } });
}

function startConsumer() {
  consume(AI_ANALYSIS_QUEUE, handleAnalysisJob);
  console.log("ai-service is listening on the AI analysis queue");
}

module.exports = { startConsumer };
