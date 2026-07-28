const mongoose = require("mongoose");
const User = require("./src/models/User");

// Connect to the local MongoDB database
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/project1";

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB for seeding...");
    const res = await User.updateOne(
      { email: "john.doe@example.com" }, 
      { role: "admin" }
    );
    console.log("DB Update Result:", res);
    process.exit(0);
  })
  .catch(err => {
    console.error("DB Seeding Failed:", err.message);
    process.exit(1);
  });
