const mongoose = require("mongoose");

const uri = "mongodb://localhost:27017/project1";

async function check() {
  await mongoose.connect(uri);
  console.log("==================================================");
  console.log("         PROJECT DATABASE COLLECTION CHECK        ");
  console.log("==================================================");
  
  const db = mongoose.connection.db;
  
  // Clean up legacy collections if they exist to keep the DB clean
  const legacyCollections = ["compliance_reports", "contracts", "notifications"];
  for (const name of legacyCollections) {
    try {
      await db.collection(name).drop();
      console.log(`Dropped legacy collection: "${name}"`);
    } catch (e) {
      // ignore if it doesn't exist
    }
  }

  const collections = await db.listCollections().toArray();
  
  console.log("\nCollections found in 'project1' database:");
  for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  - "${col.name}" collection: ${count} documents`);
  }
  console.log("==================================================\n");
  process.exit(0);
}

check().catch(err => {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
});
