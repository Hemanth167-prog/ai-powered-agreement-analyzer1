/**
 * Test script for Python Bidding Analysis & Q&A Chat Fixes
 */
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:4000";

async function runTest() {
  console.log("==================================================");
  console.log("    LEGAL AI PLATFORM - BIDDING & CHAT TESTER    ");
  console.log("==================================================\n");

  const email = "john.doe@example.com";
  const password = "Password123!";
  let token = null;

  // 1. Login as Admin
  console.log("[1/5] Logging in as Admin...");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      token = data.data.accessToken;
      console.log(`✅ Logged in successfully. Token acquired.\n`);
    } else {
      console.log(`❌ Login failed! Status: ${res.status}, Msg: ${data.message}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log("❌ Connection Error:", err.message);
    process.exit(1);
  }

  // 2. Upload bidding contract
  console.log("[2/5] Uploading contract as a BIDDING contract...");
  let contractId = null;
  try {
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const filePath = path.join(__dirname, "test-contract.txt");
    const fileContent = fs.readFileSync(filePath, "utf8");

    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test-contract.txt"',
      'Content-Type: text/plain',
      '',
      fileContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="userCountry"',
      '',
      'US',
      `--${boundary}`,
      'Content-Disposition: form-data; name="employerCountry"',
      '',
      'IN',
      `--${boundary}`,
      'Content-Disposition: form-data; name="contractType"',
      '',
      'bidding',
      `--${boundary}--`
    ].join("\r\n");

    const res = await fetch(`${BASE_URL}/api/contracts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });

    const data = await res.json();
    if (res.status === 201 && data.success) {
      contractId = data.data._id;
      console.log(`✅ Uploaded successfully. Contract ID: ${contractId}\n`);
    } else {
      console.log(`❌ Upload failed! Status: ${res.status}, Msg: ${data.message}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log("❌ Upload Error:", err.message);
    process.exit(1);
  }

  // 3. Poll for analysis completion
  console.log("[3/5] Waiting for analysis to complete...");
  let analysisFinished = false;
  for (let i = 0; i < 35; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`${BASE_URL}/api/contracts/${contractId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.status === "ANALYZED") {
        console.log(`✅ Analysis completed in ${(i+1)*3} seconds.\n`);
        analysisFinished = true;
        break;
      } else {
        console.log(`... Status: ${data.data?.status || "UNKNOWN"}`);
      }
    } catch (err) {
      console.log("Polling error:", err.message);
    }
  }

  if (!analysisFinished) {
    console.log("❌ Timeout waiting for analysis to finish.\n");
    process.exit(1);
  }

  // 4. Verify Bidding Laws & Requirements
  console.log("[4/5] Retrieving report and verifying bidding laws & requirements...");
  try {
    const res = await fetch(`${BASE_URL}/api/reports/contract/${contractId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      const { analysis } = data.data;
      console.log("Contract Type:", analysis.contractType);
      
      console.log("\n--- BIDDING LAWS EXTRACTED ---");
      if (analysis.biddingLaws && analysis.biddingLaws.length > 0) {
        analysis.biddingLaws.forEach((l, index) => {
          console.log(`[${index + 1}] ${l.lawName}: ${l.description}`);
        });
        console.log("✅ Bidding laws list is populated.");
      } else {
        console.log("❌ Bidding laws list is EMPTY!");
      }

      console.log("\n--- BIDDING REQUIREMENTS EXTRACTED ---");
      if (analysis.biddingRequirements && analysis.biddingRequirements.length > 0) {
        analysis.biddingRequirements.forEach((r, index) => {
          console.log(`[${index + 1}] ${r.title}: ${r.description}`);
        });
        console.log("✅ Bidding requirements list is populated.\n");
      } else {
        console.log("❌ Bidding requirements list is EMPTY!\n");
      }

      console.log("--- CORPORATE LAWS EXTRACTED ---");
      if (analysis.corporateLaws && analysis.corporateLaws.length > 0) {
        analysis.corporateLaws.forEach((l, index) => {
          console.log(`[${index + 1}] ${l.lawName}: ${l.description}`);
        });
        console.log("✅ Corporate laws list is populated.\n");
      } else {
        console.log("❌ Corporate laws list is EMPTY!\n");
      }
    } else {
      console.log(`❌ Failed to retrieve report! Status: ${res.status}\n`);
    }
  } catch (err) {
    console.log("❌ Report verification error:", err.message);
  }

  // 5. Test Q&A Chat Function
  console.log("[5/5] Testing contract Q&A chat...");
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contractId: contractId,
        message: "What is the notice period for contract termination?"
      })
    });
    const data = await res.json();
    if (res.status === 201 && data.success) {
      console.log("User Question: What is the notice period for contract termination?");
      console.log("Assistant Answer:", data.data.assistantMsg.message);
      if (data.data.assistantMsg.message.includes("unable to answer")) {
        console.log("❌ Chat reply fell back to fallback error string.");
      } else {
        console.log("✅ Chat assistant responded successfully using Gemini!\n");
      }
    } else {
      console.log(`❌ Chat failed! Status: ${res.status}, Msg: ${data.message}\n`);
    }
  } catch (err) {
    console.log("❌ Chat execution error:", err.message);
  }

  console.log("==================================================");
  console.log("                TEST RUN COMPLETED                ");
  console.log("==================================================");
}

runTest();
