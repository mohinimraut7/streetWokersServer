// // ── Shared Constants (used across models & controllers) ──

// // VVCMC चे सर्व Wards — Counter Officer, Survey Officer, Concern Officer (AMC)
// // हे सर्व ward-wise assign होतात
// exports.WARDS = [
//   "Ward A", "Ward B", "Ward C", "Ward D",
//   "Ward E", "Ward F", "Ward G", "Ward H", "Ward I",
// ];

// // User roles
// exports.ROLES = [
//   "vendor",            // street vendor (citizen applying for certificate)
//   "citizen",           // general citizen (grievance only)
//   "counter_officer",   // creates/edits application, forwards to survey officer
//   "survey_officer",    // field verification, geo location, photos
//   "A.M.C.",   // ward-wise AMC, final approval + payment + certificate
//   "super_admin",       // full access
// ];

// // Vendor Application status flow
// exports.APPLICATION_STATUS = [
//   "Draft",                          // vendor / counter officer ne suru केला, submit नाही
//   "Submitted",                      // vendor ne submit केला
//   "Sent Back to Vendor",            // counter officer ने corrections साठी परत पाठवला
//   "Forwarded to Survey Officer",    // counter officer ने survey officer कडे पाठवला
//   "Sent Back to Counter Officer",   // survey officer / concern officer ने चूक असल्यास परत पाठवला
//   "Survey Approved",                // survey officer ने approve केला (recommend)
//   "Forwarded to Concern Officer",   // ward-wise AMC कडे गेला
//   "Concern Officer Approved",       // AMC ने final approve केला
//   "Rejected",                       // कोणत्याही टप्प्यावर reject
//   "Payment Pending",                // approve झाल्यावर payment बाकी
//   "Payment Done",                   // payment complete
//   "Certificate Issued",             // QR based smart card generate झाला
// ];

// exports.GRIEVANCE_STATUS = ["Pending", "In Progress", "Resolved", "Rejected"];

// exports.GRIEVANCE_TYPE = ["vendor", "citizen"];





// ── Shared Constants (used across models & controllers) ──

// VVCMC चे सर्व Wards — Counter Officer, Survey Officer, A.M.C.
// हे सर्व ward-wise assign होतात
exports.WARDS = [
  "Ward A", "Ward B", "Ward C", "Ward D",
  "Ward E", "Ward F", "Ward G", "Ward H", "Ward I",
];

// User roles
exports.ROLES = [
  "vendor",            // street vendor (citizen applying for certificate) — OTP login
  "citizen",           // general citizen (grievance only) — OTP login
  "counter_officer",   // ward-wise: creates/edits application, forwards to survey officer
  "survey_officer",    // ward-wise: field verification, geo location, photos
  "A.M.C.",   // ward-wise A.M.C. (Additional Municipal Commissioner office) — final approval + payment + certificate
  "super_admin",       // full access, no ward restriction
];

// Vendor Application status flow
exports.APPLICATION_STATUS = [
  "Draft",                          // vendor / counter officer ne suru केला, submit नाही
  "Submitted",                      // vendor ne submit केला
  "Sent Back to Vendor",            // counter officer ने corrections साठी परत पाठवला
  "Forwarded to Survey Officer",    // counter officer ने survey officer कडे पाठवला
  "Sent Back to Counter Officer",   // survey officer / A.M.C. ने चूक असल्यास परत पाठवला
  "Survey Approved",                // survey officer ने approve केला (recommend)
  "Forwarded to A.M.C.",            // ward-wise A.M.C. कडे गेला
  "A.M.C. Approved",                // A.M.C. ने final approve केला
  "Rejected",                       // कोणत्याही टप्प्यावर reject
  "Payment Pending",                // approve झाल्यावर payment बाकी
  "Payment Done",                   // payment complete
  "Certificate Issued",             // QR based smart card generate झाला
];

exports.GRIEVANCE_STATUS = ["Pending", "In Progress", "Resolved", "Rejected"];

exports.GRIEVANCE_TYPE = ["vendor", "citizen"];
