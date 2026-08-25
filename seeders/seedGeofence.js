// ══════════════════════════════════════════════════════════
//  Seed Default "No Feriwala Area" Geofence
//  Feature: No Feriwala Area Geofencing
// ══════════════════════════════════════════════════════════
// Runs once on every server start. Idempotent — checks whether this exact
// area already exists (by name) before creating it, so restarting the
// server / PM2 does NOT create duplicate geofences.
const Geofence = require("../models/Geofence");

// ── EXACT polygon coordinates supplied for "No Feriwala Area" ──
// GeoJSON order: [longitude, latitude]
const NO_FERIWALA_COORDINATES = [
  [
    [72.8119891, 19.4553061],
    [72.8118175, 19.4552682],
    [72.8117209, 19.4551367],
    [72.8115439, 19.454952],
    [72.8114956, 19.4548585],
    [72.8117209, 19.4548129],
    [72.812016, 19.4549217],
    [72.8121715, 19.4551266],
    [72.812201, 19.4552935],
    [72.8119891, 19.4553061],
  ],
];

const NO_FERIWALA_NAME = "No Feriwala Area";

async function seedDefaultGeofence() {
  try {
    const existing = await Geofence.findOne({ name: NO_FERIWALA_NAME });
    if (existing) {
      console.log("ℹ️  'No Feriwala Area' geofence already exists — skipping seed.");
      return;
    }

    await Geofence.create({
      name: NO_FERIWALA_NAME,
      description: "Default No Feriwala Area — street vending is restricted inside this zone.",
      location: { type: "Polygon", coordinates: NO_FERIWALA_COORDINATES },
      status: "active",
      createdById: "",
      createdByName: "System Seed",
    });

    console.log("✅ 'No Feriwala Area' geofence seeded successfully.");
  } catch (error) {
    console.error("❌ Geofence Seed Error:", error.message);
  }
}

module.exports = seedDefaultGeofence;