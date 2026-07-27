/**
 * Integration Test Suite
 * ----------------------
 * Validates the core enhancements:
 * 1. Gateway Security Firewall (NoSQL Query Injection and Path Traversal)
 * 2. User Authentication
 * 3. Active Heartbeat updates
 * 4. Admin vs User permission checking
 */

const BASE_URL = "http://localhost:4000";

async function runTests() {
  console.log("==================================================");
  console.log("   LEGAL AI CONTRACT PLATFORM - INTEGRATION TESTS ");
  console.log("==================================================\n");

  let testUserToken = null;
  let userId = null;

  let smtpUser = null;
  try {
    const fs = require('fs');
    const path = require('path');
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const match = envContent.match(/^SMTP_USER\s*=\s*(.+)$/m);
    if (match) {
      smtpUser = match[1].trim();
    }
  } catch (e) {}

  const testEmail = smtpUser || `test-user-${Date.now()}@example.com`;

  // Clean up any existing user with the same email in the DB before running the tests
  try {
    const { execSync } = require('child_process');
    execSync(`docker exec -i legalai-mongo mongosh project --eval "db.users.deleteOne({ email: '${testEmail.toLowerCase()}' })"`, { stdio: 'ignore' });
  } catch (e) {}

  const testName = `Testuser${Math.random().toString(36).replace(/[^a-z]+/g, "").substring(0, 5)}1234`;
  const testPassword = "Password123!";

  // --- TEST 1: Firewall WAF (NoSQL Query Injection Block) ---
  console.log("[Test 1] Testing Gateway WAF: Block NoSQL Injection... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: { "$ne": "fake@example.com" },
        password: testPassword
      })
    });
    
    if (res.status === 403) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked with status ${res.status}`);
      console.log(`   Threat Detected: "${data.threatType}"`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Gateway returned status ${res.status} instead of 403\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 1:`, err.message, "\n");
  }

  // --- TEST 2: Firewall WAF (Path Traversal Block) ---
  console.log("[Test 2] Testing Gateway WAF: Block Path Traversal... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me?path=../../etc/passwd`, {
      method: "GET"
    });

    if (res.status === 403) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked with status ${res.status}`);
      console.log(`   Threat Detected: "${data.threatType}"`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Gateway returned status ${res.status} instead of 403\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 2:`, err.message, "\n");
  }

  // --- TEST 3: User Registration ---
  console.log("[Test 3] Testing Auth-Service: Registering regular user... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        country: "IN"
      })
    });

    const data = await res.json();
    if (res.status === 201 && data.success) {
      testUserToken = data.data.accessToken;
      userId = data.data.user.id;
      console.log(`✅ PASSED: Registered user: ${data.data.user.email} (ID: ${userId})\n`);
    } else {
      console.log(`❌ FAILED: Status ${res.status}, Message: "${data.message}"\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3:`, err.message, "\n");
  }
  // --- TEST 3.1: Reject Invalid Email ---
  console.log("[Test 3.1] Testing Auth-Service: Reject invalid email... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Valid Name",
        email: "not-an-email",
        password: testPassword,
        country: "IN"
      })
    });

    if (res.status === 400) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked invalid email with status ${res.status}`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Register returned status ${res.status} instead of 400\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.1:`, err.message, "\n");
  }

  // --- TEST 3.1.1: Reject Invalid Gmail ---
  console.log("[Test 3.1.1] Testing Auth-Service: Reject invalid Gmail format... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ValidName123",
        email: "short@gmail.com",
        password: testPassword,
        country: "IN"
      })
    });

    if (res.status === 400) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked invalid Gmail with status ${res.status}`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Register returned status ${res.status} instead of 400 for short Gmail\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.1.1:`, err.message, "\n");
  }

  // --- TEST 3.1.2: Reject Email with Uppercase Letters ---
  console.log("[Test 3.1.2] Testing Auth-Service: Reject email containing uppercase letters... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ValidName123",
        email: "Hemanth@gmail.com",
        password: testPassword,
        country: "IN"
      })
    });

    if (res.status === 400) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked uppercase email with status ${res.status}`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Register returned status ${res.status} instead of 400 for uppercase email\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.1.2:`, err.message, "\n");
  }

  // --- TEST 3.2: Reject Too Short Name ---
  console.log("[Test 3.2] Testing Auth-Service: Reject too short name... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "T",
        email: `valid-${Date.now()}@example.com`,
        password: testPassword,
        country: "IN"
      })
    });

    if (res.status === 400) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked too short name with status ${res.status}`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Register returned status ${res.status} instead of 400\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.2:`, err.message, "\n");
  }

  // --- TEST 3.3: Reject Special Characters in Name ---
  console.log("[Test 3.3] Testing Auth-Service: Reject name with special characters... ");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Name<Script>",
        email: `valid-${Date.now()}@example.com`,
        password: testPassword,
        country: "IN"
      })
    });

    if (res.status === 400) {
      const data = await res.json();
      console.log(`✅ PASSED: Blocked invalid name characters with status ${res.status}`);
      console.log(`   Response Message: "${data.message}"\n`);
    } else {
      console.log(`❌ FAILED: Register returned status ${res.status} instead of 400\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.3:`, err.message, "\n");
  }

  // --- TEST 3.4: Username Conflict / Duplication block check ---
  console.log("[Test 3.4] Testing Auth-Service: Username conflict duplication block... ");
  try {
    const uniqueBaseName = "Hemanth" + Math.random().toString(36).replace(/[^a-z]+/g, "").substring(0, 8);
    const firstEmail = `email1-${Date.now()}@example.com`;
    const secondEmail = `email2-${Date.now()}@example.com`;
    const thirdEmail = `email3-${Date.now()}@example.com`;

    // 1. First registration (no numbers)
    const res1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: uniqueBaseName,
        email: firstEmail,
        password: testPassword,
        country: "IN"
      })
    });
    const data1 = await res1.json();
    if (res1.status !== 201) {
      console.log(`❌ FAILED Test 3.4 step 1: Registration failed for unique name ${uniqueBaseName}: ${data1.message}`);
    } else {
      console.log(`   Step 1 Passed: Registered initial name "${uniqueBaseName}"`);

      // 2. Duplicate registration with exact same name (should be rejected)
      const res2 = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uniqueBaseName,
          email: secondEmail,
          password: testPassword,
          country: "IN"
        })
      });
      const data2 = await res2.json();
      if (res2.status === 400 && data2.message.includes("already taken")) {
        console.log(`   Step 2 Passed: Rejected duplicate name. Message: "${data2.message}"`);

        // 3. Different registration with numbers appended (should succeed)
        const res3 = await fetch(`${BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${uniqueBaseName}1234`,
            email: thirdEmail,
            password: testPassword,
            country: "IN"
          })
        });
        const data3 = await res3.json();
        if (res3.status === 201) {
          console.log(`✅ PASSED: Username collision duplication block flow verified successfully.\n`);
        } else {
          console.log(`❌ FAILED: Register with distinct name returned status ${res3.status}, Message: "${data3.message}"\n`);
        }
      } else {
        console.log(`❌ FAILED: Duplicate register returned status ${res2.status} (expected 400 with taken error). Message: "${data2.message}"\n`);
      }
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.4:`, err.message, "\n");
  }

  // --- TEST 3.5: Gmail Dot Normalization collision check ---
  console.log("[Test 3.5] Testing Auth-Service: Gmail dot normalization uniqueness... ");
  try {
    const randomSuffix = Math.random().toString(36).replace(/[^a-z]+/g, "").substring(0, 8);
    const gmailBase = `mygmail${randomSuffix}`;
    const email1 = `${gmailBase}@gmail.com`;
    const email2 = `my.g.m.a.i.l${randomSuffix}@gmail.com`;

    // 1. Register first Gmail user (no dots)
    const res1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `GmailUserA${Math.floor(Math.random() * 10000)}`,
        email: email1,
        password: testPassword,
        country: "IN"
      })
    });
    const data1 = await res1.json();
    if (res1.status !== 201) {
      console.log(`❌ FAILED Test 3.5 step 1: Registration failed for unique Gmail ${email1}: ${data1.message}`);
    } else {
      console.log(`   Step 1 Passed: Registered initial Gmail "${email1}"`);

      // 2. Register second Gmail user (with dots) - should be rejected with 409
      const res2 = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `GmailUserB${Math.floor(Math.random() * 10000)}`,
          email: email2,
          password: testPassword,
          country: "IN"
        })
      });
      const data2 = await res2.json();
      if (res2.status === 409 && data2.message.includes("email already exists")) {
        console.log(`✅ PASSED: Blocked Gmail dot collision on "${email2}" successfully (Message: "${data2.message}").\n`);
      } else {
        console.log(`❌ FAILED: Duplicate Gmail register returned status ${res2.status} instead of 409 (Message: "${data2.message}").\n`);
      }
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 3.5:`, err.message, "\n");
  }


  // --- TEST 4: User Heartbeat ---
  console.log("[Test 4] Testing Heartbeat Sync: Send activity heartbeat... ");
  if (!testUserToken) {
    console.log("⚠️ SKIPPED: Missing auth token from Test 3\n");
  } else {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/heartbeat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testUserToken}`
        }
      });

      const data = await res.json();
      if (res.status === 200 && data.success) {
        console.log(`✅ PASSED: Heartbeat sync successfully updated lastActiveAt timestamp.\n`);
      } else {
        console.log(`❌ FAILED: Status ${res.status}, response:`, data, "\n");
      }
    } catch (err) {
      console.log(`❌ ERROR in Test 4:`, err.message, "\n");
    }
  }

  // --- TEST 5: Insufficient Permissions (Regular user accessing Admin endpoints) ---
  console.log("[Test 5] Testing RBAC Security: User accessing Admin endpoints... ");
  if (!testUserToken) {
    console.log("⚠️ SKIPPED: Missing auth token from Test 3\n");
  } else {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/users`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${testUserToken}`
        }
      });

      if (res.status === 403) {
        const data = await res.json();
        console.log(`✅ PASSED: Blocked unauthorized regular user with status ${res.status}`);
        console.log(`   Security Message: "${data.message}"\n`);
      } else {
        console.log(`❌ FAILED: Access not blocked. Status returned: ${res.status}\n`);
      }
    } catch (err) {
      console.log(`❌ ERROR in Test 5:`, err.message, "\n");
    }
  }

  // --- TEST 6: Password Recovery Flow ---
  console.log("[Test 6] Testing Password Recovery Flow... ");
  try {
    // 6.1 Forgot Password Request (triggers OTP generation)
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail })
    });

    const forgotData = await forgotRes.json();
    if (forgotRes.status === 200 && forgotData.success && forgotData.data.otp) {
      const generatedOtp = forgotData.data.otp;
      console.log(`   OTP generated: "${generatedOtp}"`);

      // 6.2 Reset Password using the generated OTP
      const newPassword = "NewPassword123!";
      const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: generatedOtp, newPassword })
      });

      const resetData = await resetRes.json();
      if (resetRes.status === 200 && resetData.success) {
        console.log(`   Password successfully reset.`);

        // 6.3 Verify login with OLD password fails
        const loginOldRes = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        if (loginOldRes.status === 401) {
          console.log(`   Verified: Login with old password rejected.`);

          // 6.4 Verify login with NEW password succeeds
          const loginNewRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: testEmail, password: newPassword })
          });
          const loginNewData = await loginNewRes.json();
          if (loginNewRes.status === 200 && loginNewData.success) {
            console.log(`   Verified: Login with new password succeeded.`);
            console.log(`✅ PASSED: Password recovery flow completed successfully.\n`);
          } else {
            console.log(`❌ FAILED: Login with new password returned status ${loginNewRes.status}\n`);
          }
        } else {
          console.log(`❌ FAILED: Login with old password succeeded or returned status ${loginOldRes.status}\n`);
        }
      } else {
        console.log(`❌ FAILED: Reset password returned status ${resetRes.status}, Message: "${resetData.message}"\n`);
      }
    } else {
      console.log(`❌ FAILED: Forgot password returned status ${forgotRes.status}, Message: "${forgotData.message}"\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR in Test 6:`, err.message, "\n");
  }

  console.log("==================================================");
  console.log("               TEST SUITE COMPLETED               ");
  console.log("==================================================");
}

runTests();
