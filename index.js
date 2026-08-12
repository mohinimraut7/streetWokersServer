require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const vendorApplicationRoutes = require("./routes/vendorApplicationRoutes");
const grievanceRoutes = require("./routes/grievanceRoutes");

const app = express();

// ── Middlewares ──
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true,limit: "25mb" }));

// ── DB Connect ──
connectDB();

// ── Routes ──
app.use("/api/users", userRoutes);
app.use("/api/applications", vendorApplicationRoutes);
app.use("/api/grievances", grievanceRoutes);

// ── Health check ──
app.get("/", (req, res) => {
  res.send("✅ SVMS Backend (Street Vendors Management System - VVCMC) is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
