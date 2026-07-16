from flask import Flask, request, jsonify
import os
import requests
import json
from pymongo import MongoClient

app = Flask(__name__)

# Connect to MongoDB
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/?appName=MongoDB+Compass&directConnection=true&serverSelectionTimeoutMS=2000")
if os.environ.get("DOCKER_ENV") or os.path.exists("/.dockerenv"):
    mongo_uri = mongo_uri.replace("localhost:27017", "mongo:27017")

db_client = MongoClient(mongo_uri)
db = db_client["legalai_bidding"]
bidding_logs = db["bidding_analysis_logs"]

GEMINI_API_KEY = "GEMINI_API_KEY_PLACEHOLDER"

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

        prompt = f"""You are an expert multilingual legal contract analysis assistant specializing in bidding, procurement, and tender documents.

CRITICAL — LANGUAGE HANDLING:
- The contract/bidding document below may be written in ANY language (English, Arabic, French, Hindi, Chinese, Spanish, German, Japanese, Russian, Portuguese, or any other language).
- You MUST auto-detect the language of the document automatically.
- You MUST fully understand and analyse the document in its original language, regardless of what that language is.
- You MUST return ALL output fields in clear English, translated from the original language.
- NEVER refuse or skip analysis because of the language. Always process it completely.

Analyse this bidding contract strictly under the laws of {company_country}.

Jurisdictions:
- User country: {user_country}
- Employer/Company country: {employer_country}
- Client country: {client_country or "N/A"}

CRITICAL EXTRACTION REQUIREMENTS:
1. You MUST extract ALL bid submission deadlines and bid opening dates from the document — these are the most important fields.
2. Search thoroughly for any dates related to: bid submission deadline, last date for submission, tender closing date, bid opening date, pre-bid meeting date, clarification deadline.
3. If dates are in another language or format (e.g. Arabic numerals, Chinese calendar), convert them to a recognisable format.
4. List ALL bidding/procurement/tender laws of {company_country}.
5. List ALL requirements to participate in this bidding process.
6. List ALL corporate laws of {company_country} applicable to this contract.

Return ONLY a valid JSON object — no markdown fences (no ```json), no commentary:
{{
  "detectedLanguage": "name of the language the contract is written in",
  "summary": "plain-language English summary highlighting key laws in **bold** and explicitly mentioning the bid opening date and submission deadline.",
  "clauses": [{{ "title": "clause name", "text": "quote or summary", "category": "category" }}],
  "risks": [{{ "title": "", "description": "", "severity": "LOW|MEDIUM|HIGH" }}],
  "complianceIssues": [{{ "title": "", "description": "", "regulationReference": "" }}],
  "biddingLaws": [{{ "lawName": "law/act name", "description": "how it applies to bidding in {company_country}" }}],
  "biddingRequirements": [{{ "title": "requirement title", "description": "specific requirement or criteria to participate" }}],
  "corporateLaws": [{{ "lawName": "corporate law/act name", "description": "how it applies to this contract" }}],
  "biddingDeadlines": [
    {{
      "title": "Bid Submission Deadline",
      "date": "extracted date string e.g. 31 August 2026 or 2026-08-31",
      "description": "Context from the document about this deadline"
    }}
  ],
  "bidOpeningDate": "extracted bid opening date string, or null if not found"
}}

Contract/Bidding Document text:
\"\"\"
{text[:15000]}
\"\"\"
"""

        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        response = requests.post(url, json=payload, headers=headers, timeout=90)
        response.raise_for_status()

        resp_data = response.json()
        model_text = resp_data['candidates'][0]['content']['parts'][0]['text']

        # Clean and parse JSON
        cleaned = model_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip().rstrip("`").strip()
        parsed = json.loads(cleaned)

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
