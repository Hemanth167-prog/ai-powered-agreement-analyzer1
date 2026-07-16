// Builds a structured prompt for Gemini supporting any language.
// The model is instructed to auto-detect the contract language, process it natively,
// and return all output in English so the platform stays consistent.
function buildPrompt({ text, userCountry, employerCountry, clientCountry, legalRepository }) {
  return `You are an expert multilingual legal contract analysis assistant.

IMPORTANT — LANGUAGE HANDLING:
- The contract text below may be written in ANY language (English, Arabic, French, Hindi, Chinese, Spanish, German, Japanese, or any other).
- You MUST auto-detect the language of the contract.
- You MUST fully understand and analyse the contract in its original language.
- You MUST return ALL output fields in clear English, regardless of the contract's original language.
- Never refuse or skip analysis because of the language. Always process it.

Analyse the following contract text strictly under: ${legalRepository}.

Jurisdictions involved:
- User country: ${userCountry}
- Employer country: ${employerCountry}
- Client country: ${clientCountry || "N/A"}

You MUST identify and list corporate laws (Companies Act, business regulations, corporate governance, shareholder agreements) of the countries involved that apply to this contract.

Return ONLY a valid JSON object (no markdown fences, no commentary) with this exact shape:
{
  "detectedLanguage": "name of the language the contract is written in, e.g. English, Arabic, French",
  "summary": "plain-language summary (in English) of the contract. MUST explicitly highlight the specific laws, acts, or regulations involved using markdown bold (**Law Name**).",
  "clauses": [{ "title": "clause name", "text": "exact quote or summary", "category": "e.g. Termination, Liability, IP" }],
  "risks": [{ "title": "", "description": "", "severity": "LOW|MEDIUM|HIGH" }],
  "complianceIssues": [{ "title": "", "description": "", "regulationReference": "" }],
  "corporateLaws": [{ "lawName": "corporate law/act name", "description": "how it applies to this contract" }],
  "biddingDeadlines": [],
  "bidOpeningDate": null
}

Note: biddingDeadlines and bidOpeningDate should remain empty/null for standard (non-bidding) contracts.

Contract text:
"""
${text.slice(0, 15000)}
"""`;
}

module.exports = { buildPrompt };
