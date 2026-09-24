/**
 * scripts/backupVendorApplications.js
 *
 * vendorapplications collection cha PURNA backup JSON file madhe.
 *
 * READ-ONLY: fakta find() karto. DB madhe kahich lihit / badlat / delete karat nahi.
 * Production DB sathi surakshit.
 *
 * - Sagle records, sagle fields (_id, dates, statusHistory sah) export hotat.
 * - _id → { "$oid": ... } ani dates → { "$date": ... } format madhe (Atlas sarkha),
 *   tyamule garaj padlyas hi file jashichi tashi punha import karta yete.
 * - Records ek-ek karun file madhe lihile jatat → memory kami lagte.
 *
 * USAGE (server folder madhun):
 *   node scripts/backupVendorApplications.js
 *
 * Output: server folder → backups/vendorapplications-<date-time>.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { EJSON } = mongoose.mongo.BSON;

(async () => {
  let out;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected (READ-ONLY backup)");

    const col = mongoose.connection.db.collection("vendorapplications");
    const total = await col.countDocuments();
    console.log(`Total records: ${total}`);

    const dir = path.join(__dirname, "..", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outFile = path.join(dir, `vendorapplications-${stamp}.json`);

    out = fs.createWriteStream(outFile, { encoding: "utf8" });
    const write = (text) =>
      new Promise((resolve) => (out.write(text) ? resolve() : out.once("drain", resolve)));

    await write("[\n");
    let count = 0;

    for await (const doc of col.find({}).sort({ _id: 1 })) {
      await write((count ? ",\n" : "") + EJSON.stringify(doc, { relaxed: true }));
      count++;
      if (count % 1000 === 0) console.log(`… ${count}/${total}`);
    }

    await write("\n]\n");
    await new Promise((resolve) => out.end(resolve));

    const sizeMb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Backup purna: ${count} records → ${outFile} (${sizeMb} MB)`);
    if (count !== total) console.log(`⚠️ Export ${count}, DB count ${total} — backup chalu astana records badalle asu shaktat.`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (out) out.end();
  } finally {
    await mongoose.disconnect();
  }
})();