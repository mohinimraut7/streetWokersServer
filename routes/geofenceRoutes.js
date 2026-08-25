// ══════════════════════════════════════════════════════════
//  Geofence Routes — "No Feriwala Area" management
//  Feature: No Feriwala Area Geofencing
// ══════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();

const {
  getAllGeofences,
  getGeofenceById,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  checkLocation,
} = require("../controllers/geofenceController");

const { protect, allowRoles } = require("../middlewares/auth");

// ── Check whether a lat/lng is inside a restricted area ──
// Used by: Survey Officer (NewSurvey.jsx) while capturing GPS location.
// Any logged-in role can call this (survey_officer needs it most).
router.post("/check-location", protect, checkLocation);

// ── View all geofences — any logged-in role (map display needs this too) ──
router.get("/", protect, getAllGeofences);
router.get("/:id", protect, getGeofenceById);

// ── Manage geofences — A.M.C. / super_admin only ──
router.post("/", protect, allowRoles("A.M.C.", "super_admin"), createGeofence);
router.put("/:id", protect, allowRoles("A.M.C.", "super_admin"), updateGeofence);
router.delete("/:id", protect, allowRoles("A.M.C.", "super_admin"), deleteGeofence);

module.exports = router;