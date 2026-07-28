from flask import Flask, request, jsonify
import os
import requests
import json
from pymongo import MongoClient

app = Flask(__name__)

# Connect to MongoDB
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/project")
if os.environ.get("DOCKER_ENV") or os.path.exists("/.dockerenv"):
    mongo_uri = mongo_uri.replace("localhost:27017", "mongo:27017")

db_client = MongoClient(mongo_uri)
db = db_client["project"]
bidding_logs = db["bidding_analysis_logs"]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"success": True, "message": "bidding-service (Python) healthy"})

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        user_country = data.get("userCountry", "")
        employer_country = data.get("employerCountry", "")
        client_country = data.get("clientCountry", "")

        company_country = employer_country or user_country

        prompt = f"""You are an expert legal bidding contract analysis assistant.

IMPORTANT — LANGUAGE HANDLING:
- The contract text below may be written in ANY language.
- You MUST auto-detect the language of the document.
- You MUST fully understand and analyse the document in its original language, regardless of what that language is.
- You MUST return ALL output fields in clear, standard English.
- Under NO circumstances should any other language than English be used in the output fields (including the summary, clauses, risks, compliance issues, etc.). Everything must be translated and presented in English.
- NEVER refuse or skip analysis because of the language. Always process it completely.

Analyse this bidding contract strictly under the laws of {company_country}.

Jurisdictions:
- User country: {user_country}
- Employer/Company country: {employer_country}
- Client country: {client_country or "N/A"}

CRITICAL EXTRACTION REQUIREMENTS:
1. PINPOINT EVERY LAW EXHAUSTIVELY: Find, identify, extract, and list EVERY single law, act, regulation, statutory provision, code, governing law, corporate law, or legal repository rule of {company_country} mentioned, referenced, or applicable in the bidding contract/tender. Under no circumstances should any law/regulation present in the contract be left out. Do not summarize, skip, or group laws. Every single law must have its own dedicated item in the output array.
2. PINPOINT EVERY DATE: Find, extract, and list EVERY single date, deadline, validity period, payment due date, bid submission deadline, tender closing date, bid opening date, pre-bid meeting date, clarification deadline, or project timeline milestone.
3. EXTRACT ALL RISKS & COMPLIANCE ISSUES EXHAUSTIVELY: Audit the contract text comprehensively. You MUST extract every single risk involved (low, medium, or high severity) and identify every compliance issue or gap. No potential risk or compliance discrepancy found in the text may be ignored or omitted. Clearly describe the risks and compliance requirements to inform the user completely.
4. EXTRACT ALL CLAUSES EXHAUSTIVELY without grouping or omission: You must find, extract, and detail EVERY single clause and section present in the contract. Do not omit any clause. Do not group multiple distinct clauses under a single item (for example, do not group "Governing Law", "Severability", and "Entire Agreement" into a single "Miscellaneous" or "General" item—they must be extracted as separate, individual items in the clauses array). To avoid running out of output tokens, write concise text summaries/quotes, but ensure that 100% of the clauses are represented in the array.
5. ASSESS FAVORABILITY: Evaluate the overall balance of this bidding contract/tender. Estimate the favorability score (as a percentage out of 100) for the user/bidder and for the opposite side (issuer/client). The sum of both percentages must equal exactly 100. Provide a detailed, professional legal rationale for each side's score.

Return ONLY a valid JSON object — no markdown fences (no ```json), no commentary:
{{
  "detectedLanguage": "name of the language the contract is written in",
  "summary": "An exhaustive, comprehensive contract summary in English that extracts and includes EVERYTHING from the bidding document. Do not omit any details, clauses, requirements, dates, or regulations. It MUST begin with a dedicated section titled 'APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:' containing a bulleted list of every law/act involved, followed by sections for 'CRITICAL DATES & TIMELINE MILESTONES:', 'KEY OBLIGATIONS & CONTRACT TERMS:', 'RISKS & DISCREPANCIES:', and 'BIDDING & ELIGIBILITY REQUIREMENTS:' (if applicable), ensuring all details from the original contract text are fully incorporated. The summary MUST be written strictly and entirely in English, without using any other language.",
  "clauses": [{{ "title": "clause name", "text": "exact quote or highly detailed summary from the contract", "category": "category" }}],
  "risks": [{{ "title": "Detailed risk title", "description": "Why this is a risk and potential legal/business impact", "severity": "LOW|MEDIUM|HIGH" }}],
  "complianceIssues": [{{ "title": "Compliance issue", "description": "Detailed gap or action required to comply", "regulationReference": "Specific law, regulation, or act section reference" }}],
  "biddingLaws": [{{ "lawName": "Full bidding/tender law name", "description": "Detailed explanation of how it applies to bidding in {company_country}" }}],
  "biddingRequirements": [{{ "title": "Requirement title (e.g. Earnest Money, Net Worth)", "description": "Detailed criteria, documents needed, or conditions to participate" }}],
  "corporateLaws": [{{ "lawName": "Full corporate law/act name", "description": "Detailed explanation of how it applies to the company and contract" }}],
  "biddingDeadlines": [
    {{
      "title": "Name of the deadline (e.g. Submission Deadline, Clarification Date)",
      "date": "extracted date string e.g. 31 August 2026 or 2026-08-31",
      "description": "Context and detailed description of what is due on this date"
    }}
  ],
  "bidOpeningDate": "extracted bid opening date string, or null if not found",
  "favorability": {{
    "userPercentage": 50,
    "oppositePercentage": 50,
    "userRationale": "A detailed explanation of why the contract is favorable to the user/bidder, highlighting beneficial criteria, EMD terms, or pricing/payment setups.",
    "oppositeRationale": "A detailed explanation of why the contract is favorable to the opposite side (issuer), highlighting strict timelines, penalties, compliance mandates, or EMD forfeiture clauses."
  }}
}}

Contract/Bidding Document text:
\"\"\"
{text}
\"\"\"
"""

        model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        import time
        import random
        max_retries = 1
        attempt = 0
        response = None
        while True:
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=90)
                response.raise_for_status()
                break
            except requests.exceptions.RequestException as err:
                attempt += 1
                status_code = err.response.status_code if err.response is not None else None
                is_transient = status_code in [429, 502, 503, 504]
                if is_transient and attempt < max_retries:
                    delay = min(30.0, (2.5 ** attempt) * 1.5) + random.random()
                    print(f"Bidding Gemini call failed with status {status_code}. Retrying in {delay:.2f}s... (Attempt {attempt}/{max_retries})")
                    time.sleep(delay)
                else:
                    raise err

        resp_data = response.json()
        
        # Verify response content structure
        if 'candidates' not in resp_data or not resp_data['candidates']:
            raise ValueError(f"Gemini API returned no candidates. Response: {json.dumps(resp_data)}")
            
        candidate = resp_data['candidates'][0]
        if 'content' not in candidate or 'parts' not in candidate['content'] or not candidate['content']['parts']:
            raise ValueError(f"Gemini API candidate has no content or parts. Response: {json.dumps(resp_data)}")
            
        model_text = candidate['content']['parts'][0].get('text', '')
        if not model_text:
            raise ValueError("Gemini API candidate returned empty text.")

        # Clean and parse JSON
        cleaned = model_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip().rstrip("`").strip()
        
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as decode_err:
            print(f"Failed to parse Gemini response as JSON: {decode_err}. Falling back to text summary.")
            parsed = {
                "detectedLanguage": "Unknown",
                "summary": cleaned,
                "clauses": [],
                "risks": [
                    {
                        "title": "Malformed Response Warning",
                        "description": "The AI model returned text that could not be parsed as valid structured JSON. See raw summary for details.",
                        "severity": "MEDIUM"
                    }
                ],
                "complianceIssues": [],
                "biddingLaws": [],
                "biddingRequirements": [],
                "corporateLaws": [],
                "biddingDeadlines": [],
                "bidOpeningDate": None,
                "favorability": {
                    "userPercentage": 50,
                    "oppositePercentage": 50,
                    "userRationale": "Standard bidding parameters detected. Review detailed corporate/bidding rules to verify compliance and protection.",
                    "oppositeRationale": "Standard procurement obligations apply. Review eligibility, deadlines, and EMD requirements carefully."
                }
            }

        # Log to MongoDB
        bidding_logs.insert_one({
            "userCountry": user_country,
            "employerCountry": employer_country,
            "companyCountry": company_country,
            "contractLength": len(text),
            "detectedLanguage": parsed.get("detectedLanguage", "Unknown"),
            "hasBiddingDeadlines": len(parsed.get("biddingDeadlines", [])) > 0,
            "bidOpeningDate": parsed.get("bidOpeningDate"),
            "status": "SUCCESS"
        })

        return jsonify({"success": True, "data": parsed})

    except Exception as e:
        try:
            bidding_logs.insert_one({"status": "FAILED", "error": str(e)})
        except:
            pass
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 4009))
    app.run(host='0.0.0.0', port=port)
