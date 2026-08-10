// const express = require("express");
// const router = express.Router();

// const {
//   createGrievance,
//   getAllGrievances,
//   getGrievanceByNo,
//   assignGrievance,
//   replyGrievance,
// } = require("../controllers/grievanceController");

// const uploadGrievance = require("../middlewares/uploadGrievance");
// const { protect, allowRoles } = require("../middlewares/auth");

// // ── File a grievance — Vendor OR Citizen ──
// router.post("/create", protect, allowRoles("vendor", "citizen"), uploadGrievance, createGrievance);

// // ── Get all grievances (role/ward filtered) ──
// router.get("/getAll", protect, getAllGrievances);

// // ── Get single grievance ──
// router.get("/:grievanceNo", protect, getGrievanceByNo);

// // ── Assign to officer — Counter/Concern Officer or Super Admin ──
// router.patch(
//   "/assign/:grievanceNo",
//   protect,
//   allowRoles("counter_officer", "concern_officer", "super_admin"),
//   assignGrievance
// );

// // ── Reply / update status ──
// router.patch(
//   "/reply/:grievanceNo",
//   protect,
//   allowRoles("counter_officer", "concern_officer", "super_admin"),
//   replyGrievance
// );

// module.exports = router;


const express = require("express");
const router = express.Router();

const {
  createGrievance,
  getAllGrievances,
  getGrievanceByNo,
  assignGrievance,
  replyGrievance,
} = require("../controllers/grievanceController");

const uploadGrievance = require("../middlewares/uploadGrievance");
const { protect, allowRoles } = require("../middlewares/auth");

// ── File a grievance — Vendor OR Citizen ──
router.post("/create", protect, allowRoles("vendor", "citizen"), uploadGrievance, createGrievance);

// ── Get all grievances (role/ward filtered) ──
router.get("/getAll", protect, getAllGrievances);

// ── Get single grievance ──
router.get("/:grievanceNo", protect, getGrievanceByNo);

// ── Assign to officer — Counter Officer/A.M.C. or Super Admin ──
router.patch(
  "/assign/:grievanceNo",
  protect,
  allowRoles("counter_officer", "A.M.C.", "super_admin"),
  assignGrievance
);

// ── Reply / update status ──
router.patch(
  "/reply/:grievanceNo",
  protect,
  allowRoles("counter_officer", "A.M.C.", "super_admin"),
  replyGrievance
);

module.exports = router;
