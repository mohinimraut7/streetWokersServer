// ══════════════════════════════════════════════════════════
//  Geofence Controller — "No Feriwala Area" CRUD + location check
//  Feature: No Feriwala Area Geofencing
// ══════════════════════════════════════════════════════════
const Geofence = require("../models/Geofence");
const { isValidLatLng, isValidPolygon, findRestrictedAreaForPoint } = require("../services/geofenceService");

// ── 1) GET all geofences ──
exports.getAllGeofences = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const geofences = await Geofence.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: geofences });
  } catch (error) {
    console.error("Get All Geofences Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ── 2) GET single geofence by id ──
exports.getGeofenceById = async (req, res) => {
  try {
    const geofence = await Geofence.findById(req.params.id);
    if (!geofence) return res.status(404).json({ success: false, message: "Geofence not found ❌" });
    return res.status(200).json({ success: true, data: geofence });
  } catch (error) {
    console.error("Get Geofence Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ── 3) CREATE geofence ──
exports.createGeofence = async (req, res) => {
  try {
    const { name, description, coordinates, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Geofence name is required ❌" });
    }

    if (!isValidPolygon(coordinates)) {
      return res.status(400).json({
        success: false,
        message: "Invalid polygon coordinates ❌ — must be a closed ring of [lng, lat] points, each within valid lat/lng ranges, with at least 4 points and the first/last point matching.",
      });
    }

    const geofence = await Geofence.create({
      name: name.trim(),
      description: description || "",
      location: { type: "Polygon", coordinates },
      status: status === "inactive" ? "inactive" : "active",
      createdById: req.user?.id || "",
      createdByName: req.user?.userName || "",
    });

    return res.status(201).json({ success: true, message: "Geofence Created ✅", data: geofence });
  } catch (error) {
    console.error("Create Geofence Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ── 4) UPDATE geofence ──
exports.updateGeofence = async (req, res) => {
  try {
    const { name, description, coordinates, status } = req.body;

    const geofence = await Geofence.findById(req.params.id);
    if (!geofence) return res.status(404).json({ success: false, message: "Geofence not found ❌" });

    if (coordinates !== undefined) {
      if (!isValidPolygon(coordinates)) {
        return res.status(400).json({
          success: false,
          message: "Invalid polygon coordinates ❌ — must be a closed ring of [lng, lat] points, each within valid lat/lng ranges.",
        });
      }
      geofence.location = { type: "Polygon", coordinates };
    }

    if (name !== undefined) geofence.name = name.trim();
    if (description !== undefined) geofence.description = description;
    if (status !== undefined) geofence.status = status === "inactive" ? "inactive" : "active";

    await geofence.save();

    return res.status(200).json({ success: true, message: "Geofence Updated ✅", data: geofence });
  } catch (error) {
    console.error("Update Geofence Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ── 5) DELETE geofence ──
exports.deleteGeofence = async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndDelete(req.params.id);
    if (!geofence) return res.status(404).json({ success: false, message: "Geofence not found ❌" });
    return res.status(200).json({ success: true, message: "Geofence Deleted ✅" });
  } catch (error) {
    console.error("Delete Geofence Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ── 6) CHECK LOCATION — is a given lat/lng inside any active restricted area? ──
exports.checkLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || latitude === null || latitude === "" || longitude === undefined || longitude === null || longitude === "") {
      return res.status(400).json({ success: false, message: "latitude and longitude are required ❌" });
    }

    if (!isValidLatLng(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates ❌ — latitude must be between -90 and 90, longitude between -180 and 180.",
      });
    }

    const area = await findRestrictedAreaForPoint(latitude, longitude);

    if (area) {
      return res.status(200).json({
        success: true,
        isInsideRestrictedArea: true,
        area: { id: area._id, name: area.name },
        message: `Vendor is inside a ${area.name}`,
      });
    }

    return res.status(200).json({
      success: true,
      isInsideRestrictedArea: false,
      area: null,
      message: "Vendor is outside all restricted areas",
    });
  } catch (error) {
    console.error("Check Location Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};