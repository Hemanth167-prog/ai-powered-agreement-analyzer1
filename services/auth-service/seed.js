const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/project";

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB for seeding...");
    
    // Seed general admin John Doe
    const email = "john.doe@example.com";
    const password = "Password123!";
    const name = "John Doe";
    const country = "US";

    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = "admin";
      await existing.save();
      console.log("User john.doe@example.com updated to admin.");
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.create({
        name,
        email,
        passwordHash,
        country,
        role: "admin"
      });
      console.log("Admin user john.doe@example.com created.");
    }

    // Seed main admin hemanth
    const mainEmail = "parasahemanth5119640@gmail.com";
    const mainPassword = "hemanth@1234";
    const mainName = "hemanth";

    // Clean up old admin typo if exists
    await User.deleteOne({ email: "parsahemanth5119640@gmail.com" });

    const existingMain = await User.findOne({ email: mainEmail });
    if (existingMain) {
      existingMain.role = "admin";
      existingMain.name = mainName;
      existingMain.passwordHash = await bcrypt.hash(mainPassword, 12);
      await existingMain.save();
      console.log("Main admin hemanth updated.");
    } else {
      const passwordHash = await bcrypt.hash(mainPassword, 12);
      await User.create({
        name: mainName,
        email: mainEmail,
        passwordHash,
        country: "IN",
        role: "admin"
      });
      console.log("Main admin hemanth created.");
    }

    process.exit(0);
  })
  .catch(err => {
    console.error("DB Seeding Failed:", err.message);
    process.exit(1);
  });
