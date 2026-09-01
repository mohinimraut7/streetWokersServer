// backend/scripts/exportVendorRoleUsers.js
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const XLSX = require("xlsx");

const User = require("../models/User");

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const vendorUsers = await User.find({ role: "vendor" }).lean();

  console.log(`📊 role: "vendor" असलेले total documents: ${vendorUsers.length}`);

  if (vendorUsers.length === 0) {
    console.log("ℹ️  कुठलेही vendor-role users सापडले नाहीत. Excel तयार करत नाही.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Excel साठी data तयार करणे (password वगळून, security साठी) ──
  const rows = vendorUsers.map((u) => ({
    _id: u._id?.toString() || "",
    fullName: u.fullName || "",
    userName: u.userName || "",
    mobileNumber: u.mobileNumber || "",
    email: u.email || "",
    role: u.role || "",
    ward: u.ward || "",
    editAccess: u.editAccess ?? "",
    departmentName: u.departmentName || "",
    office: u.office || "",
    departmentCategory: u.departmentCategory || "",
    isActive: u.isActive ?? "",
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN") : "",
    updatedAt: u.updatedAt ? new Date(u.updatedAt).toLocaleString("en-IN") : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Role Users");

  const outputPath = path.join(__dirname, "vendor-role-users.xlsx");
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Excel file तयार झाली: ${outputPath}`);
  console.log(`📈 Total rows exported: ${rows.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});