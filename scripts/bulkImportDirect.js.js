// require("dotenv").config();
// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const User = require("../models/User");

// const SUPER_ADMIN = {
//   fullName: "System Administrator",
//   userName: "superadmin",
//   mobileNumber: "9999999999",
//   email: "admin@svms.vvcmc.co.in",
//   password: "Admin@123",
//   role: "super_admin",
//   ward: "",
//   editAccess: true,
//   departmentName: "VVCMC - System Administration",
//   office: "VVCMC",
// };

// const run = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("✅ MongoDB Connected");

//     const existing = await User.findOne({
//       $or: [{ userName: SUPER_ADMIN.userName }, { mobileNumber: SUPER_ADMIN.mobileNumber }],
//     });

//     if (existing) {
//       console.log("⚠️  Super Admin आधीच अस्तित्वात आहे — नवीन तयार केला नाही.");
//       console.log(`   userName: ${existing.userName}`);
//       process.exit(0);
//     }

//     const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);
//     const admin = await User.create({ ...SUPER_ADMIN, password: hashedPassword });

//     console.log("✅ Super Admin Created Successfully!");
//     console.log("   userName:", admin.userName);
//     console.log("   password:", SUPER_ADMIN.password);

//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Seed Error:", error.message);
//     process.exit(1);
//   }
// };

// run();




// backend/scripts/bulkImportDirect.js
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const VendorApplication = require("../models/VendorApplication");
const User = require("../models/User");
const { WARDS } = require("../utils/constants");

const HEADER_MAP = {
  "sr no": "srNo",
  name: "name",
  "mobile number": "mobile",
  "residence address": "residenceAddress",
  "working address": "workingAddress",
  "ward name": "wardName",
  "road name": "roadName",
  "business type": "businessType",
  "business place": "businessPlace",
};
const normalizeHeader = (h) => String(h || "").trim().toLowerCase();

function normalizeWard(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
  if (fullMatch) return fullMatch;
  if (/^[A-Za-z]$/.test(value)) {
    const candidate = `Ward ${value.toUpperCase()}`;
    if (WARDS.includes(candidate)) return candidate;
  }
  return "";
}

async function generateApplicationNoBatch(startCount) {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const serial = String(startCount).padStart(3, "0");
  return `VVCMC-VEND-${day}${month}${year}${serial}`;
}

async function main() {
  const filePath = process.argv[2];
  const forceWardArg = process.argv[3] || "";
  const createdByName = process.argv[4] || "bulk-import-script";

  if (!filePath) {
    console.error("❌ Usage: node scripts/bulkImportDirect.js <file.xlsx> [\"Ward A\"] [createdByName]");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const workbook = XLSX.readFile(path.resolve(filePath));
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

  const rows = rawRows.map((raw) => {
    const row = {};
    Object.entries(raw).forEach(([key, value]) => {
      const mapped = HEADER_MAP[normalizeHeader(key)];
      if (mapped) row[mapped] = typeof value === "string" ? value.trim() : value;
    });
    return row;
  });

  console.log(`📄 ${rows.length} rows read from file`);

  const skipped = [];
  const validRows = [];
  const mobilesInFile = new Set();

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const fullName = (row.name || "").toString().trim();
    const rawMobile = (row.mobile || "").toString().trim();
    const isInvalidMobile = !rawMobile || /^(na|n\/a|nan)$/i.test(rawMobile) || !/\d/.test(rawMobile);
    const mobile = isInvalidMobile ? "" : rawMobile;

    if (!fullName) { skipped.push({ row: rowNum, reason: "Full name is required" }); return; }
    if (!mobile) { skipped.push({ row: rowNum, reason: "Mobile number is missing or invalid" }); return; }

    validRows.push({ rowNum, fullName, mobile, row });
    mobilesInFile.add(mobile);
  });

  const existingApps = await VendorApplication.find(
    { "personal.mobile": { $in: [...mobilesInFile] } },
    { "personal.mobile": 1, applicationNo: 1 }
  ).lean();
  const existingMobileSet = new Set(existingApps.map((a) => a.personal.mobile));

  const existingUsers = await User.find(
    { mobileNumber: { $in: [...mobilesInFile] } },
    { mobileNumber: 1 }
  ).lean();
  const existingUserMobiles = new Set(existingUsers.map((u) => u.mobileNumber));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  let runningCount = await VendorApplication.countDocuments({ createdAt: { $gte: startOfDay } });

  const usersToCreate = [];
  const appsToInsert = [];
  const seenInThisFile = new Set();

  for (const { rowNum, fullName, mobile, row } of validRows) {
    if (existingMobileSet.has(mobile)) {
      skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists in DB` });
      continue;
    }
    if (seenInThisFile.has(mobile)) {
      skipped.push({ row: rowNum, reason: `Mobile ${mobile} duplicated within this file` });
      continue;
    }
    seenInThisFile.add(mobile);

    runningCount += 1;
    const applicationNo = await generateApplicationNoBatch(runningCount);
    const vendorId = `VDR${Date.now()}${rowNum}`;

    const finalWard = normalizeWard(forceWardArg) || normalizeWard(row.wardName) || "";

    appsToInsert.push({
      applicationNo,
      vendorId,
      personal: { fullName, mobile },
      address: {
        permanentAddress: (row.residenceAddress || "").toString().trim(),
        workingAddress: (row.workingAddress || "").toString().trim(),
        roadName: (row.roadName || "").toString().trim(),
        serialNo: `SR${Date.now()}${rowNum}`,
        ward: finalWard,
      },
      business: {
        businessType: (row.businessType || "").toString().trim(),
        businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
      },
      ward: finalWard,
      createdById: "",
      createdByName,
      createdByRole: "counter_officer",
      status: "Draft",
      statusHistory: [{ status: "Draft", changedByName: createdByName, remarks: `Bulk imported (direct script) - row ${rowNum}` }],
    });

    if (!existingUserMobiles.has(mobile)) {
      existingUserMobiles.add(mobile);
      usersToCreate.push({ fullName, mobile });
    }
  }

  console.log(`✅ ${appsToInsert.length} valid, ❌ ${skipped.length} skipped`);

  if (usersToCreate.length) {
    console.log(`Creating ${usersToCreate.length} vendor user accounts...`);
    const userDocs = [];
    for (const u of usersToCreate) {
      const hashedPassword = await bcrypt.hash(u.mobile, 10);
      userDocs.push({
        fullName: u.fullName || "Vendor",
        userName: u.mobile,
        mobileNumber: u.mobile,
        password: hashedPassword,
        role: "vendor",
      });
    }
    await User.insertMany(userDocs, { ordered: false });
    console.log("✅ User accounts created");
  }

  if (appsToInsert.length) {
    console.log(`Inserting ${appsToInsert.length} applications...`);
    const CHUNK = 300;
    for (let i = 0; i < appsToInsert.length; i += CHUNK) {
      const chunk = appsToInsert.slice(i, i + CHUNK);
      try {
        await VendorApplication.insertMany(chunk, { ordered: false });
        console.log(`  inserted ${Math.min(i + CHUNK, appsToInsert.length)} / ${appsToInsert.length}`);
      } catch (err) {
        console.error(`  ⚠️ chunk ${i}-${i + CHUNK} had errors (some may still have inserted):`, err.message);
      }
    }
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Created: ${appsToInsert.length}`);
  console.log(`Skipped: ${skipped.length}`);
  if (skipped.length) {
    console.log("First 20 skipped reasons:");
    skipped.slice(0, 20).forEach((s) => console.log(`  Row ${s.row}: ${s.reason}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});