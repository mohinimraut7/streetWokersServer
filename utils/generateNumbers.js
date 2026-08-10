const VendorApplication = require("../models/VendorApplication");
const Grievance = require("../models/Grievance");

// ── Vendor Application Number ──  e.g. VVCMC-VEND-08082026-001
exports.generateApplicationNo = async () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await VendorApplication.countDocuments({
    createdAt: { $gte: startOfDay },
  });

  const serial = String(count + 1).padStart(3, "0");
  return `VVCMC-VEND-${day}${month}${year}${serial}`;
};

// ── Grievance Number ──  e.g. VVCMC-GRV-08082026-001
exports.generateGrievanceNo = async () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await Grievance.countDocuments({
    createdAt: { $gte: startOfDay },
  });

  const serial = String(count + 1).padStart(3, "0");
  return `VVCMC-GRV-${day}${month}${year}${serial}`;
};

// ── Certificate Number ──  e.g. VVCMC-CERT-2026-0001
exports.generateCertificateNo = async () => {
  const year = new Date().getFullYear();
  const count = await VendorApplication.countDocuments({
    "certificate.certificateNo": { $ne: "" },
  });
  const serial = String(count + 1).padStart(4, "0");
  return `VVCMC-CERT-${year}-${serial}`;
};
