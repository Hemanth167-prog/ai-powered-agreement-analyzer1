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
  const testEmail = `test-user-${Date.now()}@example.com`;
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
        name: "Test User",
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

  console.log("==================================================");
  console.log("               TEST SUITE COMPLETED               ");
  console.log("==================================================");
}

runTests();
