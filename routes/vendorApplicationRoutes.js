// const express = require("express");
// const router = express.Router();

// const {
//   createApplication,
//   submitApplication,
//   updateApplication,
//   sendBackToVendor,
//   forwardToSurveyOfficer,
//   updateSurvey,
//   concernOfficerDecision,
//   recordPayment,
//   getAllApplications,
//   getApplicationByNo,
//   verifyCertificate,
// } = require("../controllers/vendorApplicationController");

// const uploadVendorApplication = require("../middlewares/uploadVendorApplication");
// const { protect, allowRoles } = require("../middlewares/auth");

// // ── Create — Vendor (self) OR Counter Officer (on behalf) ──
// router.post(
//   "/create",
//   protect,
//   allowRoles("vendor", "counter_officer"),
//   uploadVendorApplication,
//   createApplication
// );

// // ── Vendor submits their Draft ──
// router.patch("/submit/:applicationNo", protect, allowRoles("vendor"), submitApplication);

// // ── Counter Officer edits (edit access) ──
// router.patch(
//   "/update/:applicationNo",
//   protect,
//   allowRoles("counter_officer", "super_admin"),
//   uploadVendorApplication,
//   updateApplication
// );

// // ── Counter Officer sends back to vendor for correction ──
// router.patch("/sendBackToVendor/:applicationNo", protect, allowRoles("counter_officer"), sendBackToVendor);

// // ── Counter Officer forwards to Survey Officer ──
// router.patch("/forwardToSurvey/:applicationNo", protect, allowRoles("counter_officer"), forwardToSurveyOfficer);

// // ── Survey Officer updates geo location, photos, comments, recommendation ──
// router.patch(
//   "/survey/:applicationNo",
//   protect,
//   allowRoles("survey_officer"),
//   uploadVendorApplication,
//   updateSurvey
// );

// // ── Concern Officer (Ward AMC) decision: Approved / Sent Back / Rejected ──
// router.patch("/concernDecision/:applicationNo", protect, allowRoles("concern_officer"), concernOfficerDecision);

// // ── Payment + auto QR Smart Card generation ──
// router.patch("/payment/:applicationNo", protect, recordPayment);

// // ── Get all applications (role/ward filtered) ──
// router.get("/getAll", protect, getAllApplications);

// // ── Get single application ──
// router.get("/:applicationNo", protect, getApplicationByNo);

// // ── PUBLIC — QR scan verification, no login needed ──
// router.get("/public/verify/:applicationNo", verifyCertificate);

// module.exports = router;




// const express = require("express");
// const router = express.Router();

// const {
//   createApplication,
//   submitApplication,
//   updateApplication,
//   sendBackToVendor,
//   forwardToSurveyOfficer,
//   updateSurvey,
//   amcDecision,
//   recordPayment,
//   getAllApplications,
//   getApplicationByNo,
//   verifyCertificate,
// } = require("../controllers/vendorApplicationController");

// const uploadVendorApplication = require("../middlewares/uploadVendorApplication");
// const { protect, allowRoles } = require("../middlewares/auth");

// // ── Create — Vendor (self) OR Counter Officer (on behalf) ──
// router.post(
//   "/create",
//   protect,
//   allowRoles("vendor", "counter_officer"),
//   uploadVendorApplication,
//   createApplication
// );

// // ── Vendor submits their Draft ──
// router.patch("/submit/:applicationNo", protect, allowRoles("vendor"), submitApplication);

// // ── Counter Officer edits (edit access) ──
// router.patch(
//   "/update/:applicationNo",
//   protect,
//   allowRoles("counter_officer", "super_admin"),
//   uploadVendorApplication,
//   updateApplication
// );

// // ── Counter Officer sends back to vendor for correction ──
// router.patch("/sendBackToVendor/:applicationNo", protect, allowRoles("counter_officer"), sendBackToVendor);

// // ── Counter Officer forwards to Survey Officer ──
// router.patch("/forwardToSurvey/:applicationNo", protect, allowRoles("counter_officer"), forwardToSurveyOfficer);

// // ── Survey Officer updates geo location, photos, comments, recommendation ──
// router.patch(
//   "/survey/:applicationNo",
//   protect,
//   allowRoles("survey_officer"),
//   uploadVendorApplication,
//   updateSurvey
// );

// // ── A.M.C. (Ward-wise) decision: Approved / Sent Back / Rejected ──
// router.patch("/amcDecision/:applicationNo", protect, allowRoles("A.M.C."), amcDecision);

// // ── Payment + auto QR Smart Card generation ──
// router.patch("/payment/:applicationNo", protect, recordPayment);

// // ── Get all applications (role/ward filtered) ──
// router.get("/getAll", protect, getAllApplications);

// // ── Get single application ──
// router.get("/:applicationNo", protect, getApplicationByNo);

// // ── PUBLIC — QR scan verification, no login needed ──
// router.get("/public/verify/:applicationNo", verifyCertificate);

// module.exports = router;

// ===============================================================

// const express = require("express");
// const router = express.Router();

// const {
//   createApplication,
//   submitApplication,
//   updateApplication,
//   sendBackToVendor,
//   forwardToSurveyOfficer,
//   updateSurvey,
//   amcDecision,
//   recordPayment,
//   getAllApplications,
//   getApplicationByNo,
//   verifyCertificate,
// } = require("../controllers/vendorApplicationController");

// const uploadVendorApplication = require("../middlewares/uploadVendorApplication");
// const { protect, allowRoles } = require("../middlewares/auth");

// // ── Create — Vendor (self) OR Counter Officer (on behalf) ──
// router.post(
//   "/create",
//   protect,
//   allowRoles("vendor", "counter_officer"),
//   uploadVendorApplication,
//   createApplication
// );

// // ── Vendor submits their Draft ──
// // ── Vendor submits their Draft — Counter Officer / Super Admin can also submit on the vendor's
// //    behalf (e.g. rescuing an application the vendor started but never finished) ──
// router.patch("/submit/:applicationNo", protect, allowRoles("vendor", "counter_officer", "super_admin"), submitApplication);

// // ── Counter Officer edits (edit access) ──
// router.patch(
//   "/update/:applicationNo",
//   protect,
//   allowRoles("counter_officer", "super_admin"),
//   uploadVendorApplication,
//   updateApplication
// );

// // ── Counter Officer sends back to vendor for correction ──
// router.patch("/sendBackToVendor/:applicationNo", protect, allowRoles("counter_officer"), sendBackToVendor);

// // ── Counter Officer forwards to Survey Officer ──
// router.patch("/forwardToSurvey/:applicationNo", protect, allowRoles("counter_officer"), forwardToSurveyOfficer);

// // ── Survey Officer updates geo location, photos, comments, recommendation ──
// router.patch(
//   "/survey/:applicationNo",
//   protect,
//   allowRoles("survey_officer"),
//   uploadVendorApplication,
//   updateSurvey
// );

// // ── A.M.C. (Ward-wise) decision: Approved / Sent Back / Rejected ──
// router.patch("/amcDecision/:applicationNo", protect, allowRoles("A.M.C."), amcDecision);

// // ── Payment + auto QR Smart Card generation ──
// router.patch("/payment/:applicationNo", protect, recordPayment);

// // ── Get all applications (role/ward filtered) ──
// router.get("/getAll", protect, getAllApplications);

// // ── Get single application ──
// router.get("/:applicationNo", protect, getApplicationByNo);

// // ── PUBLIC — QR scan verification, no login needed ──
// router.get("/public/verify/:applicationNo", verifyCertificate);

// module.exports = router;



// ==========================================

const express = require("express");
const router = express.Router();

const {
  createApplication,
  submitApplication,
  updateApplication,
  sendBackToVendor,
  forwardToSurveyOfficer,
  updateSurvey,
  amcDecision,
  recordPayment,
  getAllApplications,
  getApplicationByNo,
  verifyCertificate,
} = require("../controllers/vendorApplicationController");

const uploadVendorApplication = require("../middlewares/uploadVendorApplication");
const { protect, allowRoles } = require("../middlewares/auth");

// ── Create — Vendor (self) OR Counter Officer (on behalf) ──
router.post(
  "/create",
  protect,
  allowRoles("vendor", "counter_officer"),
  uploadVendorApplication,
  createApplication
);

// ── Vendor submits their Draft ──
// ── Vendor submits their Draft — Counter Officer / Super Admin can also submit on the vendor's
//    behalf (e.g. rescuing an application the vendor started but never finished) ──
router.patch("/submit/:applicationNo", protect, allowRoles("vendor", "counter_officer", "super_admin"), submitApplication);

// ── Counter Officer (edit access), Vendor (their own Draft / Sent Back application), Super Admin ──
router.patch(
  "/update/:applicationNo",
  protect,
  allowRoles("vendor", "counter_officer", "super_admin"),
  uploadVendorApplication,
  updateApplication
);

// ── Counter Officer sends back to vendor for correction ──
router.patch("/sendBackToVendor/:applicationNo", protect, allowRoles("counter_officer"), sendBackToVendor);

// ── Counter Officer forwards to Survey Officer ──
router.patch("/forwardToSurvey/:applicationNo", protect, allowRoles("counter_officer"), forwardToSurveyOfficer);

// ── Survey Officer updates geo location, photos, comments, recommendation ──
router.patch(
  "/survey/:applicationNo",
  protect,
  allowRoles("survey_officer"),
  uploadVendorApplication,
  updateSurvey
);

// ── A.M.C. (Ward-wise) decision: Approved / Sent Back / Rejected ──
router.patch("/amcDecision/:applicationNo", protect, allowRoles("A.M.C."), amcDecision);

// ── Payment + auto QR Smart Card generation ──
router.patch("/payment/:applicationNo", protect, recordPayment);

// ── Get all applications (role/ward filtered) ──
router.get("/getAll", protect, getAllApplications);

// ── Get single application ──
router.get("/:applicationNo", protect, getApplicationByNo);

// ── PUBLIC — QR scan verification, no login needed ──
router.get("/public/verify/:applicationNo", verifyCertificate);

module.exports = router;
