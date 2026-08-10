require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const SUPER_ADMIN = {
  fullName: "System Administrator",
  userName: "superadmin",
  mobileNumber: "9999999999",
  email: "admin@svms.vvcmc.co.in",
  password: "Admin@123",
  role: "super_admin",
  ward: "",
  editAccess: true,
  departmentName: "VVCMC - System Administration",
  office: "VVCMC",
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    const existing = await User.findOne({
      $or: [{ userName: SUPER_ADMIN.userName }, { mobileNumber: SUPER_ADMIN.mobileNumber }],
    });

    if (existing) {
      console.log("⚠️  Super Admin आधीच अस्तित्वात आहे — नवीन तयार केला नाही.");
      console.log(`   userName: ${existing.userName}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);
    const admin = await User.create({ ...SUPER_ADMIN, password: hashedPassword });

    console.log("✅ Super Admin Created Successfully!");
    console.log("   userName:", admin.userName);
    console.log("   password:", SUPER_ADMIN.password);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error.message);
    process.exit(1);
  }
};

run();