// ══════════════════════════════════════════════════════════
//  Geofence Model — "No Feriwala Area" restricted zones
//  Feature: No Feriwala Area Geofencing
// ══════════════════════════════════════════════════════════
// Stores restricted-vendor-area polygons as proper GeoJSON so MongoDB's
// native geospatial operators ($geoIntersects, $geoWithin) can be used
// directly — no manual point-in-polygon math needed.
//
// GeoJSON coordinate order is ALWAYS [longitude, latitude].

const mongoose = require("mongoose");

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // ── GeoJSON Polygon ──
    // location.coordinates is an array of linear rings:
    // [ [ [lng, lat], [lng, lat], ... , [lng, lat] ] ]  (first ring = outer boundary,
    // first & last point of each ring MUST be identical — a "closed" polygon)
    location: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]], // [ [ [lng, lat], ... ] ]
        required: true,
      },
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    createdById: { type: String, default: "" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

// ── 2dsphere index — required for $geoIntersects / $geoWithin queries ──
geofenceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Geofence", geofenceSchema);