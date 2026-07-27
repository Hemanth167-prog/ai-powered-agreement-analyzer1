/**
 * Integration Test for MOU (Memorandum of Understanding) Analysis
 */
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:4000";

async function runTest() {
  console.log("==========================================================");
  console.log("             LEGAL AI - MOU ANALYSIS TESTER               ");
  console.log("==========================================================\n");

  const email = "john.doe@example.com";
  const password = "Password123!";
  let token = null;

  // 1. Login
  console.log("[1/4] Logging in as Admin...");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      token = data.data.accessToken;
      console.log(`✅ Logged in. Token acquired.\n`);
    } else {
      console.log(`❌ Login failed! Status: ${res.status}, Msg: ${data.message}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log("❌ Connection Error:", err.message);
    process.exit(1);
  }

  // 2. Upload MOU
  console.log("[2/4] Uploading contract as an MOU...");
  let contractId = null;
  try {
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const filePath = path.join(__dirname, "test-mou.txt");
    const fileContent = fs.readFileSync(filePath, "utf8");

    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test-mou.txt"',
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
      'mou',
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
  console.log("[3/4] Waiting for MOU analysis to complete...");
  let analysisFinished = false;
  for (let i = 0; i < 90; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`${BASE_URL}/api/contracts/${contractId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.status === "ANALYZED") {
        console.log(`✅ MOU Analysis completed in ${(i+1)*3} seconds.\n`);
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
    console.log("❌ Timeout waiting for MOU analysis to finish.\n");
    process.exit(1);
  }

  // 4. Retrieve report and verify MOU details
  console.log("[4/4] Retrieving report and verifying MOU binding elements + favorability...");
  try {
    const res = await fetch(`${BASE_URL}/api/reports/contract/${contractId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      const { analysis, riskReport } = data.data;
      
      console.log("\n------------------------------------------------");
      console.log("          MOU FAVORABILITY RATINGS              ");
      console.log("------------------------------------------------");
      if (analysis.favorability) {
        console.log(`User Score: ${analysis.favorability.userPercentage}%`);
        console.log(`Opposite Score: ${analysis.favorability.oppositePercentage}%`);
        console.log(`User Rationale: "${analysis.favorability.userRationale}"`);
        console.log(`Opposite Rationale: "${analysis.favorability.oppositeRationale}"`);
        console.log("✅ MOU Favorability parsed successfully.");
      } else {
        console.log("❌ Favorability ratings are MISSING!");
      }

      console.log("\n------------------------------------------------");
      console.log("          MOU CLAUSES & BINDING STATUS          ");
      console.log("------------------------------------------------");
      if (analysis.clauses && analysis.clauses.length > 0) {
        analysis.clauses.forEach((c, idx) => {
          console.log(`[Clause ${idx + 1}] Title: ${c.title} | Category: ${c.category}`);
          console.log(`Text excerpt: "${c.text}"\n`);
        });
        console.log(`✅ Passed: Extracted ${analysis.clauses.length} clauses.`);
      } else {
        console.log("❌ Clauses list is EMPTY!");
      }

      console.log("\n------------------------------------------------");
      console.log("          MOU RISK ASSESSMENT                   ");
      console.log("------------------------------------------------");
      console.log(`Overall Risk Level: ${riskReport?.overallRiskLevel || "NONE"}`);
      if (riskReport && riskReport.risks && riskReport.risks.length > 0) {
        riskReport.risks.forEach((r, idx) => {
          console.log(`[Risk ${idx + 1}] ${r.title} (${r.severity}): ${r.description}`);
        });
      } else {
        console.log("No risks flagged for this MOU.");
      }

    } else {
      console.log(`❌ Failed to retrieve report! Status: ${res.status}\n`);
    }
  } catch (err) {
    console.log("❌ Report verification error:", err.message);
  }

  console.log("\n==========================================================");
  console.log("             MOU TEST RUN COMPLETED                       ");
  console.log("==========================================================");
}

runTest();
