// Selects international legal repositories and national statutes relevant to contract countries.
const REPOSITORIES = {
  US: "US Uniform Commercial Code (UCC), Delaware Corporate Law & Federal FAR Regulations",
  USA: "US Uniform Commercial Code (UCC), Delaware Corporate Law & Federal FAR Regulations",
  "UNITED STATES": "US Uniform Commercial Code (UCC), Delaware Corporate Law & Federal FAR Regulations",
  "UNITED STATES OF AMERICA": "US Uniform Commercial Code (UCC), Delaware Corporate Law & Federal FAR Regulations",

  IN: "Indian Contract Act 1872, Companies Act 2013 & IT Act 2000",
  IND: "Indian Contract Act 1872, Companies Act 2013 & IT Act 2000",
  INDIA: "Indian Contract Act 1872, Companies Act 2013 & IT Act 2000",

  UK: "UK Contract (Rights of Third Parties) Act 1999, Companies Act 2006 & Employment Rights Act",
  GB: "UK Contract (Rights of Third Parties) Act 1999, Companies Act 2006 & Employment Rights Act",
  GBR: "UK Contract (Rights of Third Parties) Act 1999, Companies Act 2006 & Employment Rights Act",
  "UNITED KINGDOM": "UK Contract (Rights of Third Parties) Act 1999, Companies Act 2006 & Employment Rights Act",
  ENGLAND: "UK Contract (Rights of Third Parties) Act 1999, Companies Act 2006 & Employment Rights Act",

  DE: "German Civil Code (BGB), Commercial Code (HGB) & EU GDPR",
  GER: "German Civil Code (BGB), Commercial Code (HGB) & EU GDPR",
  GERMANY: "German Civil Code (BGB), Commercial Code (HGB) & EU GDPR",
  DEUTSCHLAND: "German Civil Code (BGB), Commercial Code (HGB) & EU GDPR",

  EE: "Estonian Law of Obligations Act (VÕS), Public Procurement Act (RHS) & EU Directives",
  EST: "Estonian Law of Obligations Act (VÕS), Public Procurement Act (RHS) & EU Directives",
  ESTONIA: "Estonian Law of Obligations Act (VÕS), Public Procurement Act (RHS) & EU Directives",
  EESTI: "Estonian Law of Obligations Act (VÕS), Public Procurement Act (RHS) & EU Directives",

  AE: "UAE Commercial Transactions Law (Decree-Law 50) & Labour Law (Decree-Law 33)",
  ARE: "UAE Commercial Transactions Law (Decree-Law 50) & Labour Law (Decree-Law 33)",
  UAE: "UAE Commercial Transactions Law (Decree-Law 50) & Labour Law (Decree-Law 33)",
  "UNITED ARAB EMIRATES": "UAE Commercial Transactions Law (Decree-Law 50) & Labour Law (Decree-Law 33)",
  DUBAI: "UAE Commercial Transactions Law (Decree-Law 50) & DIFC Contract Law Regulations",

  SG: "Singapore Contracts (Rights of Third Parties) Act & Companies Act",
  SGP: "Singapore Contracts (Rights of Third Parties) Act & Companies Act",
  SINGAPORE: "Singapore Contracts (Rights of Third Parties) Act & Companies Act",

  FR: "French Code Civil, Code de commerce & EU Directives",
  FRA: "French Code Civil, Code de commerce & EU Directives",
  FRANCE: "French Code Civil, Code de commerce & EU Directives",

  CA: "Canadian Commercial Law & Provincial Civil Codes",
  CAN: "Canadian Commercial Law & Provincial Civil Codes",
  CANADA: "Canadian Commercial Law & Provincial Civil Codes",

  AU: "Australian Consumer Law & Corporations Act 2001",
  AUS: "Australian Consumer Law & Corporations Act 2001",
  AUSTRALIA: "Australian Consumer Law & Corporations Act 2001",

  DEFAULT: "UNCITRAL Model Law on International Commercial Arbitration & UN CISG Convention",
};

// Returns exact statutory laws and international conventions based on country inputs
const COUNTRY_LAWS_MAP = {
  GERMANY: [
    { lawName: "Handelsgesetzbuch (HGB) - German Commercial Code", description: "Governs commercial entity status, merchant contracts, trade practices, and accounting obligations in Germany." },
    { lawName: "Bürgerliches Gesetzbuch (BGB) - German Civil Code", description: "Regulates general contract formation (§ 145 BGB), breach remedies, indemnities, and statutory default terms." },
    { lawName: "Kündigungsschutzgesetz (KSchG) - Employment Protection Act", description: "Mandates statutory notice periods and dismissal protection for German employment agreements." },
    { lawName: "EU General Data Protection Regulation (GDPR)", description: "Mandates strict personal data processing, cross-border transfer safeguards, and privacy consent rules." }
  ],
  ESTONIA: [
    { lawName: "Riigihangete seadus (Public Procurement Act of Estonia)", description: "Mandates open tender evaluation, non-discrimination of bidders, and statutory security deposit rules." },
    { lawName: "Võlaõigusseadus (Law of Obligations Act - VÕS)", description: "Governs contract formation, contractual obligations, damages claims, and statutory interest for breach in Estonia." },
    { lawName: "Äriseadustik (Commercial Code of Estonia)", description: "Regulates corporate entity registration, board authorization, and legal representative capacity." },
    { lawName: "European Public Procurement Directive (2014/24/EU)", description: "Sets EU-wide standards for public procurement, cross-border bidding transparency, and tender notices." }
  ],
  UNITED_STATES: [
    { lawName: "Uniform Commercial Code (UCC Article 2 - Sales)", description: "Governs commercial sale contracts, warranty disclaimers, breach remedies, and good-faith execution across US states." },
    { lawName: "Delaware General Corporation Law (DGCL)", description: "Applies to corporate capacity, board resolutions, shareholder approvals, and officer execution powers." },
    { lawName: "Federal Acquisition Regulation (FAR Part 15)", description: "Regulates federal and public sector contracting, competitive proposal negotiation, and cost principles in the US." },
    { lawName: "Defend Trade Secrets Act (DTSA)", description: "Provides federal civil remedies for misappropriation of proprietary trade secrets and confidential data." }
  ],
  UNITED_KINGDOM: [
    { lawName: "UK Contract (Rights of Third Parties) Act 1999", description: "Regulates third-party enforcement rights and statutory exclusion clauses in UK agreements." },
    { lawName: "UK Companies Act 2006", description: "Governs corporate officer duties, statutory filings, legal capacity, and execution under company seal." },
    { lawName: "UK Employment Rights Act 1996", description: "Sets statutory notice periods, unfair dismissal protections, and redundancy pay mandates in the UK." },
    { lawName: "UK Data Protection Act 2018 & UK GDPR", description: "Enforces data controller and processor obligations for UK personal data processing." }
  ],
  UNITED_ARAB_EMIRATES: [
    { lawName: "UAE Commercial Transactions Law (Federal Decree-Law No. 50 of 2022)", description: "Regulates commercial contracts, commercial agency rules, and payment instrument enforceability in the UAE." },
    { lawName: "UAE Labour Law (Federal Decree-Law No. 33 of 2021)", description: "Mandates employment notice periods, end-of-service gratuity calculations, and non-compete enforceability." },
    { lawName: "UAE Civil Transactions Law (Federal Law No. 5 of 1985)", description: "Governs general contract law, force majeure, liquidated damages, and good-faith performance." }
  ],
  INDIA: [
    { lawName: "Indian Contract Act 1872", description: "Governs validity of agreements, offer and acceptance, breach compensation (Section 73), and non-compete rules (Section 27)." },
    { lawName: "Companies Act 2013", description: "Regulates corporate capacity, board resolution mandates, auditor powers (Section 143), and corporate filings." },
    { lawName: "Information Technology Act 2000", description: "Recognizes electronic contract execution (Section 10A), digital signatures, and data protection due diligence (Section 43A)." },
    { lawName: "Arbitration and Conciliation Act 1996", description: "Provides statutory framework for international and domestic arbitration agreements and enforcement." }
  ],
  FRANCE: [
    { lawName: "Code civil français (French Civil Code - Art. 1101 et seq.)", description: "Governs contract formation, breach remedies, force majeure, and statutory good faith obligations." },
    { lawName: "Code de commerce (French Commercial Code)", description: "Regulates commercial contracts, payment terms, statutory interest penalties, and corporate governance." },
    { lawName: "Code du travail (French Labor Code)", description: "Mandates employment notice periods, working hours restrictions, and severance rules in France." }
  ],
  SINGAPORE: [
    { lawName: "Singapore Contracts (Rights of Third Parties) Act (Cap. 53B)", description: "Governs third-party contractual rights and enforcement exclusions under Singapore law." },
    { lawName: "Singapore Companies Act (Cap. 50)", description: "Regulates corporate entity formation, director duties, corporate authority, and statutory execution." },
    { lawName: "Singapore Employment Act (Cap. 91)", description: "Mandates statutory notice, termination pay, and employment dispute resolution standards." }
  ],
  CANADA: [
    { lawName: "Canadian Commercial Law & Common Law Principles", description: "Governs contract enforceability, breach remedies, and commercial obligations across Canadian provinces." },
    { lawName: "Canada Business Corporations Act (CBCA)", description: "Regulates corporate capacity, officer liabilities, and board resolution authority." }
  ],
  AUSTRALIA: [
    { lawName: "Australian Consumer Law (Schedule 2 of Competition and Consumer Act 2010)", description: "Governs unfair contract terms, commercial guarantees, and consumer protection in Australia." },
    { lawName: "Corporations Act 2001 (Cth)", description: "Regulates company capacity, director duties (Section 180), and corporate execution under company seal." }
  ]
};

const COUNTRY_KEYS_MAP = {
  GERMANY: ["GERMANY", "GERMAN", "DEUTSCHLAND", "DE", "GER"],
  ESTONIA: ["ESTONIA", "EESTI", "EE", "EST"],
  UNITED_STATES: ["UNITED STATES", "UNITED STATES OF AMERICA", "USA", "US", "AMERICA"],
  UNITED_KINGDOM: ["UNITED KINGDOM", "ENGLAND", "GREAT BRITAIN", "UK", "GB", "GBR"],
  DUBAI: ["DUBAI"],
  UNITED_ARAB_EMIRATES: ["UNITED ARAB EMIRATES", "UAE", "AE", "ARE", "EMIRATES"],
  INDIA: ["INDIA", "IN", "IND"],
  FRANCE: ["FRANCE", "FRENCH", "FR", "FRA"],
  SINGAPORE: ["SINGAPORE", "SG", "SGP"],
  CANADA: ["CANADA", "CAN", "CA"],
  AUSTRALIA: ["AUSTRALIA", "AUS", "AU"]
};

function getCanonicalCountry(countryInput) {
  if (!countryInput) return null;
  const clean = countryInput.toUpperCase().trim();
  for (const [canonical, aliases] of Object.entries(COUNTRY_KEYS_MAP)) {
    const matched = aliases.some(alias => {
      if (alias.length <= 3) {
        // Match as a whole word to avoid substring matching like "IN" in "FINLAND"
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        return regex.test(clean);
      }
      return clean.includes(alias);
    });
    if (matched) {
      return canonical;
    }
  }
  return null;
}

function selectRepository(countries = []) {
  const matched = [];
  countries.forEach(c => {
    if (!c) return;
    const clean = c.toUpperCase().trim();
    if (REPOSITORIES[clean]) matched.push(REPOSITORIES[clean]);
    else {
      const canonical = getCanonicalCountry(c);
      if (canonical) {
        const repoKey = canonical.replace(/_/g, " ");
        if (REPOSITORIES[repoKey]) {
          matched.push(REPOSITORIES[repoKey]);
        }
      }
    }
  });

  if (matched.length === 0) return REPOSITORIES.DEFAULT;
  const uniqueRepos = [...new Set(matched)];
  return uniqueRepos.join(" & ");
}

function getInternationalLawsForCountries(countries = []) {
  const lawsList = [];
  const processedKeys = new Set();

  countries.forEach(c => {
    if (!c) return;
    const raw = c.trim();
    let canonical = getCanonicalCountry(raw);
    
    // DUBAI maps to UNITED_ARAB_EMIRATES for laws
    if (canonical === "DUBAI") {
      canonical = "UNITED_ARAB_EMIRATES";
    }

    if (canonical && !processedKeys.has(canonical)) {
      processedKeys.add(canonical);
      if (COUNTRY_LAWS_MAP[canonical]) {
        lawsList.push(...COUNTRY_LAWS_MAP[canonical]);
      }
    } else if (!canonical && raw.length > 2) {
      // Dynamic fallback statutory framework for any other global country name
      const countryTitle = raw.charAt(0).toUpperCase() + raw.slice(1);
      lawsList.push({
        lawName: `${countryTitle} Civil Code & Law of Obligations`,
        description: `Governs validity of agreement, offer and acceptance, contract breach remedies, and statutory indemnities in ${countryTitle}.`
      });
      lawsList.push({
        lawName: `${countryTitle} Commercial Code & Business Entities Regulations`,
        description: `Regulates corporate entity capacity, board authorization, commercial contracts, and statutory filings in ${countryTitle}.`
      });
      lawsList.push({
        lawName: `${countryTitle} Statutory Data Protection & Privacy Act`,
        description: `Enforces personal data processing compliance, cross-border transfer rules, and privacy consent mandates in ${countryTitle}.`
      });
    }
  });

  // Always append international treaty defaults for cross-border contracts
  lawsList.push({
    lawName: "UNCITRAL Model Law on International Commercial Arbitration",
    description: "Standard international framework for cross-border dispute resolution and arbitral award enforcement under the New York Convention."
  });
  lawsList.push({
    lawName: "UN Convention on Contracts for the International Sale of Goods (CISG)",
    description: "Governs international commercial sale contracts, delivery duties, and buyer/seller breach remedies across contracting states."
  });

  return lawsList;
}

module.exports = { selectRepository, getInternationalLawsForCountries, REPOSITORIES };

