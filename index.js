require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const vendorApplicationRoutes = require("./routes/vendorApplicationRoutes");
const grievanceRoutes = require("./routes/grievanceRoutes");

const geofenceRoutes = require("./routes/geofenceRoutes");
const seedDefaultGeofence = require("./seeders/seedGeofence");

const app = express();

// ── Middlewares ──
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true,limit: "25mb" }));

// ── DB Connect ──
// connectDB();

// ── DB Connect ──
connectDB().then(() => {
  // ── Seed default "No Feriwala Area" geofence (idempotent — safe on every restart) ──
  seedDefaultGeofence();
});

// ── Routes ──
app.use("/api/users", userRoutes);
app.use("/api/applications", vendorApplicationRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/geofences", geofenceRoutes); // NEW — No Feriwala Area Geofencing
// ── Health check ──
app.get("/", (req, res) => {
  res.send("✅ SVMS Backend (Street Vendors Management System - VVCMC) is running");
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
