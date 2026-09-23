/**
 * scripts/fixCertificateNumbers.js
 * Juna VVCMC-CERT-xxxx number asnarya vendors la VVCMC-SV-<year>-<DB position> deto.
 * Position = generateCertificateNo() pramane (_id order).
 *
 * USAGE:
 *   node scripts/fixCertificateNumbers.js          → DRY RUN (fakt dakhavto, kahi badlat nahi)
 *   node scripts/fixCertificateNumbers.js --apply  → DB update karto
 */
require("dotenv").config();
const mongoose = require("mongoose");
const VendorApplication = require("../models/VendorApplication");

const APPLY = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected", APPLY ? "(APPLY MODE)" : "(DRY RUN)");

  // Sagle _id order ne → position map
  const allIds = await VendorApplication.find({}, { _id: 1 }).sort({ _id: 1 }).lean();
  const positionMap = new Map();
  allIds.forEach((d, i) => positionMap.set(String(d._id), i + 1));

  const targets = await VendorApplication.find(
    { "certificate.certificateNo": { $regex: /^VVCMC-CERT-/ } },
    { _id: 1, applicationNo: 1, "certificate.certificateNo": 1, "certificate.issueDate": 1 }
  ).lean();

  console.log(`Total vendors: ${allIds.length} | Juna CERT number asnare: ${targets.length}`);

  let updated = 0;
  for (const app of targets) {
    const position = positionMap.get(String(app._id));
    const year = app.certificate?.issueDate
      ? new Date(app.certificate.issueDate).getFullYear()
      : new Date().getFullYear();
    const newNo = `VVCMC-SV-${year}-${String(position).padStart(5, "0")}`;

    console.log(`${app.applicationNo}: ${app.certificate.certificateNo} → ${newNo}`);

    if (APPLY) {
      await VendorApplication.updateOne(
        { _id: app._id },
        { $set: { "certificate.certificateNo": newNo } }
      );
      updated++;
    }
  }

  console.log(APPLY ? `✅ ${updated} records updated` : "ℹ️ DRY RUN — kahi update zala nahi. --apply lava.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Error:", err);
  await mongoose.disconnect();
  process.exit(1);
});