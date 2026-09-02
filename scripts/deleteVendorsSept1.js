/**
 * scripts/deleteVendorsSept1.js
 *
 * PURPOSE:
 *   Deletes all users with role = "vendor" whose account was created on
 *   1 September 2026 (UTC day), i.e. createdAt in:
 *     2026-09-01T00:00:00.000Z  ->  2026-09-02T00:00:00.000Z
 *
 *   Matches the record shown in Mongo Atlas:
 *     createdAt: ISODate('2026-09-01T04:59:38.587+00:00')
 *
 * SAFETY:
 *   - ONLY the User model / "users" collection is touched. No other
 *     collection (grievances, geofences, vendorapplications, etc.) is
 *     imported, queried, or modified.
 *   - Runs in DRY-RUN mode by default: it will only COUNT and LIST the
 *     matching users, it will NOT delete anything.
 *   - To actually delete, run again with the --confirm flag.
 *
 * USAGE (from svms-backend folder, where your .env with MONGO_URI lives):
 *
 *   # 1) Dry run — see who WOULD be deleted (no changes made)
 *   node scripts/deleteVendorsSept1.js
 *
 *   # 2) Review the printed list carefully.
 *
 *   # 3) Actually delete (irreversible!)
 *   node scripts/deleteVendorsSept1.js --confirm
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const START_DATE = new Date("2026-09-01T00:00:00.000Z");
const END_DATE = new Date("2026-09-02T00:00:00.000Z");

const isConfirmed = process.argv.includes("--confirm");

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI not found in environment (.env). Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB:", mongoose.connection.name);

  const filter = {
    role: "vendor",
    createdAt: { $gte: START_DATE, $lt: END_DATE },
  };

  // 1) Find matching users first — always, so we know exactly what will be affected.
  const matches = await User.find(filter).select(
    "fullName userName mobileNumber role createdAt"
  );

  console.log(`\n🔎 Found ${matches.length} vendor user(s) created on 2026-09-01 (UTC):\n`);

  matches.forEach((u, i) => {
    console.log(
      `${i + 1}. ${u.fullName || "-"} | userName: ${u.userName} | mobile: ${u.mobileNumber} | createdAt: ${u.createdAt.toISOString()}`
    );
  });

  if (matches.length === 0) {
    console.log("\nKahi match zala nahi. Kahi delete karaychi garaj nahi.");
    await mongoose.disconnect();
    return;
  }

  if (!isConfirmed) {
    console.log(
      `\n⚠️  DRY RUN mode — vaparil kahi delete zala NAHI.` +
        `\n   Varchi list bagha, sagle barobar vatat asel tar he chala:` +
        `\n\n     node scripts/deleteVendorsSept1.js --confirm\n`
    );
    await mongoose.disconnect();
    return;
  }

  // 2) Only when --confirm is passed, actually delete — still scoped to the same filter.
  const result = await User.deleteMany(filter);
  console.log(`\n🗑️  Deleted ${result.deletedCount} vendor user(s) from the "users" collection.`);

  await mongoose.disconnect();
  console.log("✅ Done. Disconnected.");
}

run().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});