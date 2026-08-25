// ══════════════════════════════════════════════════════════
//  Geofence Service — geospatial helper functions
//  Feature: No Feriwala Area Geofencing
// ══════════════════════════════════════════════════════════
const Geofence = require("../models/Geofence");

// ── Validate latitude/longitude ranges ──
function isValidLatLng(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return false;
  if (latNum < -90 || latNum > 90) return false;
  if (lngNum < -180 || lngNum > 180) return false;
  return true;
}

// ── Validate a GeoJSON Polygon coordinates array ──
// coordinates shape: [ [ [lng, lat], [lng, lat], ... ] ]  (array of linear rings)
function isValidPolygon(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;

  for (const ring of coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return false; // min 4 points (closed triangle)

    for (const point of ring) {
      if (!Array.isArray(point) || point.length !== 2) return false;
      const [lng, lat] = point;
      if (!isValidLatLng(lat, lng)) return false;
    }

    // ── First and last point of the ring must match (closed polygon) ──
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) return false;
  }

  return true;
}

// ── Core check: is the given point inside ANY active restricted geofence? ──
// Uses MongoDB's native $geoIntersects (works off the 2dsphere index — reliable
// and avoids re-implementing ray-casting point-in-polygon math by hand).
async function findRestrictedAreaForPoint(lat, lng) {
  const point = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)], // GeoJSON order: [lng, lat]
  };

  const area = await Geofence.findOne({
    status: "active",
    location: {
      $geoIntersects: { $geometry: point },
    },
  });

  return area; // null if outside all restricted areas
}

module.exports = {
  isValidLatLng,
  isValidPolygon,
  findRestrictedAreaForPoint,
};