// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };




// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");
// const { WARDS } = require("../utils/constants");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };
// // ═══════════════════════════════════════════════════════
// //  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
// //      (parsed on the frontend into a plain JSON array; no documents are attached here —
// //      documents can be uploaded later via the normal Update flow)
// // ═══════════════════════════════════════════════════════

// // Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// // Returns "" if it cannot be resolved to one of the known wards.
// const normalizeWard = (raw) => {
//   if (!raw) return "";
//   const value = String(raw).trim();
//   if (!value) return "";

//   // Already a full, valid ward name (case-insensitive match)
//   const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
//   if (fullMatch) return fullMatch;

//   // Single letter like "I" or "i" → "Ward I"
//   if (/^[A-Za-z]$/.test(value)) {
//     const candidate = `Ward ${value.toUpperCase()}`;
//     if (WARDS.includes(candidate)) return candidate;
//   }

//   return "";
// };

// exports.bulkImportApplications = async (req, res) => {
//   try {
//     // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
//     // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
//     //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
//     const { rows } = req.body;

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "No rows to import ❌" });
//     }

//     // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
//     //    regardless of what the sheet says (same security principle as single create) ──
//     if (req.user.role === "counter_officer" && !req.user.ward) {
//       return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//     }
//     const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

//     const created = [];
//     const skipped = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i] || {};
//       const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

//       const fullName = (row.name || "").toString().trim();
//       const mobile = (row.mobile || "").toString().trim();

//       if (!fullName || !mobile) {
//         skipped.push({ row: rowNum, reason: "Full name and mobile number are required" });
//         continue;
//       }

//       // ── Duplicate check — same mobile number already in the system ──
//       const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
//       if (existing) {
//         skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
//         continue;
//       }

//       const finalWard = officerWard || normalizeWard(row.wardName) || "";

//       const applicationNo = await generateApplicationNo();
//       const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

//       const newApplication = new VendorApplication({
//         applicationNo,
//         vendorId,
//         personal: { fullName, mobile },
//         address: {
//           permanentAddress: (row.residenceAddress || "").toString().trim(),
//           currentAddress: (row.workingAddress || "").toString().trim(),
//           roadName: (row.roadName || "").toString().trim(),
//           serialNo: `SR${Date.now()}${i}`,
//           ward: finalWard,
//         },
//         business: {
//           businessType: (row.businessType || "").toString().trim(),
//           businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
//         },
//         ward: finalWard,
//         createdById: req.user?.id || "",
//         createdByName: req.user?.userName || "",
//         createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
//         counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
//         counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
//         status: "Draft",
//       });

//       pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
//       await newApplication.save();

//       created.push({ row: rowNum, applicationNo, vendorId, fullName });
//     }

//     return res.status(201).json({
//       success: true,
//       message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
//       createdCount: created.length,
//       skippedCount: skipped.length,
//       created,
//       skipped,
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };



// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");
// const { WARDS } = require("../utils/constants");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };
// // ═══════════════════════════════════════════════════════
// //  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
// //      (parsed on the frontend into a plain JSON array; no documents are attached here —
// //      documents can be uploaded later via the normal Update flow)
// // ═══════════════════════════════════════════════════════

// // Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// // Returns "" if it cannot be resolved to one of the known wards.
// const normalizeWard = (raw) => {
//   if (!raw) return "";
//   const value = String(raw).trim();
//   if (!value) return "";

//   // Already a full, valid ward name (case-insensitive match)
//   const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
//   if (fullMatch) return fullMatch;

//   // Single letter like "I" or "i" → "Ward I"
//   if (/^[A-Za-z]$/.test(value)) {
//     const candidate = `Ward ${value.toUpperCase()}`;
//     if (WARDS.includes(candidate)) return candidate;
//   }

//   return "";
// };

// exports.bulkImportApplications = async (req, res) => {
//   try {
//     // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
//     // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
//     //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
//     const { rows } = req.body;

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "No rows to import ❌" });
//     }

//     // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
//     //    regardless of what the sheet says (same security principle as single create) ──
//     if (req.user.role === "counter_officer" && !req.user.ward) {
//       return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//     }
//     const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

//     const created = [];
//     const skipped = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i] || {};
//       const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

//       const fullName = (row.name || "").toString().trim();
//       const rawMobile = (row.mobile || "").toString().trim();

//       // "NA", "N/A", "NaN", or anything with no digits at all is not a usable mobile number —
//       // treat it as missing, not as a real value to duplicate-check against.
//       const isInvalidMobile = !rawMobile || /^(na|n\/a|nan)$/i.test(rawMobile) || !/\d/.test(rawMobile);
//       const mobile = isInvalidMobile ? "" : rawMobile;

//       if (!fullName) {
//         skipped.push({ row: rowNum, reason: "Full name is required" });
//         continue;
//       }
//       if (!mobile) {
//         skipped.push({ row: rowNum, reason: "Mobile number is missing or invalid" });
//         continue;
//       }

//       // ── Duplicate check — same mobile number already in the system ──
//       const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
//       if (existing) {
//         skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
//         continue;
//       }

//       const finalWard = officerWard || normalizeWard(row.wardName) || "";

//       const applicationNo = await generateApplicationNo();
//       const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

//       const newApplication = new VendorApplication({
//         applicationNo,
//         vendorId,
//         personal: { fullName, mobile },
//         address: {
//           permanentAddress: (row.residenceAddress || "").toString().trim(),
//           currentAddress: (row.workingAddress || "").toString().trim(),
//           roadName: (row.roadName || "").toString().trim(),
//           serialNo: `SR${Date.now()}${i}`,
//           ward: finalWard,
//         },
//         business: {
//           businessType: (row.businessType || "").toString().trim(),
//           businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
//         },
//         ward: finalWard,
//         createdById: req.user?.id || "",
//         createdByName: req.user?.userName || "",
//         createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
//         counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
//         counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
//         status: "Draft",
//       });

//       pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
//       await newApplication.save();

//       created.push({ row: rowNum, applicationNo, vendorId, fullName });
//     }

//     return res.status(201).json({
//       success: true,
//       message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
//       createdCount: created.length,
//       skippedCount: skipped.length,
//       created,
//       skipped,
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };



// const VendorApplication = require("../models/VendorApplication");
// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");
// const { WARDS } = require("../utils/constants");

// // ── Finds the vendor's real User account by mobile number, creating one if it doesn't exist yet
// //    (e.g. when a Counter Officer registers a vendor who has never logged in themselves).
// //    Default password = the mobile number itself; the vendor can log in with it right away
// //    (via password login) or change it later, and can also still use OTP login anytime. ──
// async function findOrCreateVendorUser({ mobile, fullName }) {
//   if (!mobile) return null;
//   let vendorUser = await User.findOne({ mobileNumber: mobile });
//   if (!vendorUser) {
//     const hashedPassword = await bcrypt.hash(mobile, 10);
//     vendorUser = await User.create({
//       fullName: fullName || "Vendor",
//       userName: mobile,
//       mobileNumber: mobile,
//       password: hashedPassword,
//       role: "vendor",
//     });
//   }
//   return vendorUser;
// }

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     // ── When a Counter Officer creates this on the vendor's behalf, resolve (or auto-create)
//     //    the vendor's own User account by mobile number, so the application is owned by the
//     //    vendor from the start — this is what lets the vendor see/edit it once they log in,
//     //    including after it's sent back for corrections. ──
//     let ownerId = req.user?.id || "";
//     let ownerName = req.user?.userName || personalData.fullName;
//     if (createdByRole === "counter_officer") {
//       const vendorUser = await findOrCreateVendorUser({
//         mobile: personalData.mobile,
//         fullName: personalData.fullName,
//       });
//       if (vendorUser) {
//         ownerId = vendorUser._id.toString();
//         ownerName = vendorUser.fullName;
//       }
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: ownerId,
//       createdByName: ownerName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application (by createdById OR matching mobile —
//     //    covers applications a counter officer filled in on their behalf), and only while
//     //    it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       const isOwnApplication =
//         application.createdById === req.user.id ||
//         (req.user.mobileNumber && application.personal?.mobile === req.user.mobileNumber);
//       if (!isOwnApplication) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId, mobileNumber } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला स्वतः submit केलेले (createdById match) आणि counter officer ने त्याच्या
//       // वतीने बनवलेले (मोबाईल नंबर match) — दोन्ही प्रकारचे applications दिसायला हवेत.
//       const orConditions = [{ createdById: userId }];
//       if (mobileNumber) orConditions.push({ "personal.mobile": mobileNumber });
//       filter.$or = orConditions;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };
// // ═══════════════════════════════════════════════════════
// //  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
// //      (parsed on the frontend into a plain JSON array; no documents are attached here —
// //      documents can be uploaded later via the normal Update flow)
// // ═══════════════════════════════════════════════════════

// // Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// // Returns "" if it cannot be resolved to one of the known wards.
// const normalizeWard = (raw) => {
//   if (!raw) return "";
//   const value = String(raw).trim();
//   if (!value) return "";

//   // Already a full, valid ward name (case-insensitive match)
//   const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
//   if (fullMatch) return fullMatch;

//   // Single letter like "I" or "i" → "Ward I"
//   if (/^[A-Za-z]$/.test(value)) {
//     const candidate = `Ward ${value.toUpperCase()}`;
//     if (WARDS.includes(candidate)) return candidate;
//   }

//   return "";
// };

// exports.bulkImportApplications = async (req, res) => {
//   try {
//     // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
//     // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
//     //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
//     const { rows } = req.body;

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "No rows to import ❌" });
//     }

//     // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
//     //    regardless of what the sheet says (same security principle as single create) ──
//     if (req.user.role === "counter_officer" && !req.user.ward) {
//       return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//     }
//     const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

//     const created = [];
//     const skipped = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i] || {};
//       const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

//       const fullName = (row.name || "").toString().trim();
//       const rawMobile = (row.mobile || "").toString().trim();

//       // "NA", "N/A", "NaN", or anything with no digits at all is not a usable mobile number —
//       // treat it as missing, not as a real value to duplicate-check against.
//       const isInvalidMobile = !rawMobile || /^(na|n\/a|nan)$/i.test(rawMobile) || !/\d/.test(rawMobile);
//       const mobile = isInvalidMobile ? "" : rawMobile;

//       if (!fullName) {
//         skipped.push({ row: rowNum, reason: "Full name is required" });
//         continue;
//       }
//       if (!mobile) {
//         skipped.push({ row: rowNum, reason: "Mobile number is missing or invalid" });
//         continue;
//       }

//       // ── Duplicate check — same mobile number already in the system ──
//       const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
//       if (existing) {
//         skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
//         continue;
//       }

//       const finalWard = officerWard || normalizeWard(row.wardName) || "";

//       const applicationNo = await generateApplicationNo();
//       const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

//       // ── Same as the single-create flow: resolve/auto-create the vendor's own User account
//       //    by mobile number, so this row is owned by the actual vendor, not the officer. ──
//       let ownerId = req.user?.id || "";
//       let ownerName = req.user?.userName || "";
//       if (req.user?.role === "counter_officer") {
//         const vendorUser = await findOrCreateVendorUser({ mobile, fullName });
//         if (vendorUser) {
//           ownerId = vendorUser._id.toString();
//           ownerName = vendorUser.fullName;
//         }
//       }

//       const newApplication = new VendorApplication({
//         applicationNo,
//         vendorId,
//         personal: { fullName, mobile },
//         address: {
//           permanentAddress: (row.residenceAddress || "").toString().trim(),
//           currentAddress: (row.workingAddress || "").toString().trim(),
//           roadName: (row.roadName || "").toString().trim(),
//           serialNo: `SR${Date.now()}${i}`,
//           ward: finalWard,
//         },
//         business: {
//           businessType: (row.businessType || "").toString().trim(),
//           businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
//         },
//         ward: finalWard,
//         createdById: ownerId,
//         createdByName: ownerName,
//         createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
//         counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
//         counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
//         status: "Draft",
//       });

//       pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
//       await newApplication.save();

//       created.push({ row: rowNum, applicationNo, vendorId, fullName });
//     }

//     return res.status(201).json({
//       success: true,
//       message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
//       createdCount: created.length,
//       skippedCount: skipped.length,
//       created,
//       skipped,
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };



// ===========================================================


// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };




// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");
// const { WARDS } = require("../utils/constants");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };
// // ═══════════════════════════════════════════════════════
// //  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
// //      (parsed on the frontend into a plain JSON array; no documents are attached here —
// //      documents can be uploaded later via the normal Update flow)
// // ═══════════════════════════════════════════════════════

// // Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// // Returns "" if it cannot be resolved to one of the known wards.
// const normalizeWard = (raw) => {
//   if (!raw) return "";
//   const value = String(raw).trim();
//   if (!value) return "";

//   // Already a full, valid ward name (case-insensitive match)
//   const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
//   if (fullMatch) return fullMatch;

//   // Single letter like "I" or "i" → "Ward I"
//   if (/^[A-Za-z]$/.test(value)) {
//     const candidate = `Ward ${value.toUpperCase()}`;
//     if (WARDS.includes(candidate)) return candidate;
//   }

//   return "";
// };

// exports.bulkImportApplications = async (req, res) => {
//   try {
//     // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
//     // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
//     //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
//     const { rows } = req.body;

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "No rows to import ❌" });
//     }

//     // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
//     //    regardless of what the sheet says (same security principle as single create) ──
//     if (req.user.role === "counter_officer" && !req.user.ward) {
//       return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//     }
//     const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

//     const created = [];
//     const skipped = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i] || {};
//       const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

//       const fullName = (row.name || "").toString().trim();
//       const mobile = (row.mobile || "").toString().trim();

//       if (!fullName || !mobile) {
//         skipped.push({ row: rowNum, reason: "Full name and mobile number are required" });
//         continue;
//       }

//       // ── Duplicate check — same mobile number already in the system ──
//       const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
//       if (existing) {
//         skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
//         continue;
//       }

//       const finalWard = officerWard || normalizeWard(row.wardName) || "";

//       const applicationNo = await generateApplicationNo();
//       const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

//       const newApplication = new VendorApplication({
//         applicationNo,
//         vendorId,
//         personal: { fullName, mobile },
//         address: {
//           permanentAddress: (row.residenceAddress || "").toString().trim(),
//           currentAddress: (row.workingAddress || "").toString().trim(),
//           roadName: (row.roadName || "").toString().trim(),
//           serialNo: `SR${Date.now()}${i}`,
//           ward: finalWard,
//         },
//         business: {
//           businessType: (row.businessType || "").toString().trim(),
//           businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
//         },
//         ward: finalWard,
//         createdById: req.user?.id || "",
//         createdByName: req.user?.userName || "",
//         createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
//         counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
//         counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
//         status: "Draft",
//       });

//       pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
//       await newApplication.save();

//       created.push({ row: rowNum, applicationNo, vendorId, fullName });
//     }

//     return res.status(201).json({
//       success: true,
//       message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
//       createdCount: created.length,
//       skippedCount: skipped.length,
//       created,
//       skipped,
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };



// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
//       business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: address ? JSON.parse(address) : {},
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };





// const VendorApplication = require("../models/VendorApplication");
// const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// const generateQrDataUrl = require("../utils/qrGenerator");
// const { checkWardAccess } = require("../utils/wardAccess");
// const { WARDS } = require("../utils/constants");

// // ── छोटा helper: statusHistory मध्ये entry push करा ──
// const pushHistory = (application, status, user, remarks = "") => {
//   application.statusHistory.push({
//     status,
//     changedById: user?.id || "",
//     changedByName: user?.userName || "",
//     changedByRole: user?.role || "",
//     remarks,
//   });
// };

// // ═══════════════════════════════════════════════════════
// //  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// // ═══════════════════════════════════════════════════════
// exports.createApplication = async (req, res) => {
//   try {
//     const {
//       personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//       address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
//       business,      // JSON string: { vendorType, businessType, businessPlace }
//       ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
//       vendingLocation,
//       isRenewal, previousApplicationNo,
//     } = req.body;

//     const personalData = personal ? JSON.parse(personal) : {};

//     if (!personalData.fullName || !personalData.mobile) {
//       return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
//     }

//     // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
//     const documents = {
//       photo: req.files?.photo?.[0]?.path || "",
//       aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
//       panCard: req.files?.panCard?.[0]?.path || "",
//       addressProof: req.files?.addressProof?.[0]?.path || "",
//       businessProof: req.files?.businessProof?.[0]?.path || "",
//     };

//     const applicationNo = await generateApplicationNo();
//     const vendorId = `VDR${Date.now()}`;

//     // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
//     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
//     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

//     // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
//     let finalWard = ward || "";
//     if (createdByRole === "counter_officer") {
//       if (!req.user.ward) {
//         return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//       }
//       finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
//     }

//     // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
//     const addressData = address ? JSON.parse(address) : {};
//     if (!addressData.serialNo) {
//       addressData.serialNo = `SR${Date.now()}`;
//     }

//     const newApplication = new VendorApplication({
//       applicationNo,
//       vendorId,
//       personal: personalData,
//       address: addressData,
//       business: business ? JSON.parse(business) : {},
//       documents,
//       ward: finalWard,
//       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
//       createdById: req.user?.id || "",
//       createdByName: req.user?.userName || personalData.fullName,
//       createdByRole,
//       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
//       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
//       status,
//       isRenewal: !!isRenewal,
//       previousApplicationNo: previousApplicationNo || "",
//     });

//     pushHistory(newApplication, status, req.user, "Application created");
//     await newApplication.save();

//     return res.status(201).json({
//       success: true,
//       message: "Application Created Successfully ✅",
//       applicationNo,
//       vendorId,
//       data: newApplication,
//     });
//   } catch (error) {
//     console.error("Create Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // ═══════════════════════════════════════════════════════
// exports.submitApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
//     if (req.user.role === "counter_officer") {
//       const wardCheck = checkWardAccess(req.user, application.ward);
//       if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
//     }

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(
//       application,
//       "Submitted",
//       req.user,
//       req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
//     );
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
//   } catch (error) {
//     console.error("Submit Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// // ═══════════════════════════════════════════════════════
// exports.updateApplication = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer can only edit applications in their own ward ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
//     if (req.user.role === "vendor") {
//       if (application.createdById !== req.user.id) {
//         return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
//       }
//       if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
//         return res.status(400).json({
//           success: false,
//           message: "You can only edit your application while it's in Draft or Sent Back status ❌",
//         });
//       }
//     }

//     const oldWard = application.ward;

//     // ── Nested groups (sent as JSON strings, merged with existing values) ──
//     // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
//     // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
//     // business: { vendorType, businessType, businessPlace }
//     if (req.body.personal) {
//       application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
//     }
//     if (req.body.address) {
//       application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
//     }
//     if (req.body.business) {
//       application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
//     }

//     // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
//     if (req.body.ward !== undefined) application.ward = req.body.ward;

//     // ── Log the zone change in history (a different officer will now be responsible) ──
//     if (req.body.ward && req.body.ward !== oldWard) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
//     }

//     if (req.body.vendingLocation) {
//       application.vendingLocation = JSON.parse(req.body.vendingLocation);
//     }

//     // ── Named document re-upload (any one or more documents can be re-uploaded) ──
//     const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
//     docFields.forEach((field) => {
//       if (req.files?.[field]?.[0]) {
//         application.documents = application.documents || {};
//         application.documents[field] = req.files[field][0].path;
//       }
//     });

//     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // ═══════════════════════════════════════════════════════
// exports.sendBackToVendor = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { remarks } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.status = "Sent Back to Vendor";
//     application.counterOfficerRemarks = remarks || "";
//     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
//   } catch (error) {
//     console.error("Send Back Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  5) FORWARD TO SURVEY OFFICER — counter officer
// // ═══════════════════════════════════════════════════════
// exports.forwardToSurveyOfficer = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
//       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
//     }

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
//     }
//     application.counterOfficerId = req.user?.id || application.counterOfficerId;
//     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
//     application.status = "Forwarded to Survey Officer";

//     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
//     await application.save();

//     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
//   } catch (error) {
//     console.error("Forward Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // ═══════════════════════════════════════════════════════
// exports.updateSurvey = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { lat, lng, comments, recommendation, ward } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     if (application.status !== "Forwarded to Survey Officer") {
//       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
//     }

//     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

//     application.survey = {
//       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
//       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
//       comments: comments || application.survey?.comments || "",
//       recommendation: recommendation || "",
//       surveyOfficerId: req.user?.id || "",
//       surveyOfficerName: req.user?.userName || "",
//       surveyDate: new Date(),
//     };

//     if (ward && ward !== application.ward) {
//       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
//       application.ward = ward; // survey officer ला पण zone change करता येतो
//     }

//     // ── Recommendation नुसार पुढे पाठवा ──
//     if (recommendation === "Approve") {
//       application.status = "Forwarded to A.M.C.";
//       pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
//     } else if (recommendation === "Send Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
//     } else {
//       pushHistory(application, application.status, req.user, "Survey details updated");
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
//   } catch (error) {
//     console.error("Update Survey Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  7) A.M.C. DECISION — Ward-wise final approval
// // ═══════════════════════════════════════════════════════
// exports.amcDecision = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Forwarded to A.M.C.") {
//       return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
//     }

//     // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
//     const wardCheck = checkWardAccess(req.user, application.ward);
//     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

//     application.amcAction = {
//       officerId: req.user?.id || "",
//       officerName: req.user?.userName || "",
//       ward: application.ward,
//       remarks: remarks || "",
//       decision,
//       actionDate: new Date(),
//     };

//     if (decision === "Approved") {
//       application.status = "A.M.C. Approved";
//       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
//       pushHistory(application, "A.M.C. Approved", req.user, remarks);
//       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
//       application.status = "Payment Pending";
//       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
//     } else if (decision === "Sent Back") {
//       application.status = "Sent Back to Counter Officer";
//       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
//     } else if (decision === "Rejected") {
//       application.status = "Rejected";
//       pushHistory(application, "Rejected", req.user, remarks);
//     }

//     await application.save();

//     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
//   } catch (error) {
//     console.error("A.M.C. Decision Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // ═══════════════════════════════════════════════════════
// exports.recordPayment = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const { amount, transactionId, receiptUrl } = req.body;

//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     if (application.status !== "Payment Pending") {
//       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
//     }

//     application.payment = {
//       amount: amount || application.payment?.amount || 0,
//       status: "Paid",
//       transactionId: transactionId || "",
//       paidDate: new Date(),
//       receiptUrl: receiptUrl || "",
//     };
//     application.status = "Payment Done";
//     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

//     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
//     const certificateNo = await generateCertificateNo();
//     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

//     const issueDate = new Date();
//     const validTill = new Date();
//     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

//     application.certificate = {
//       certificateNo,
//       qrCodeData: verifyUrl,
//       qrCodeUrl: qrDataUrl,
//       issueDate,
//       validTill,
//     };
//     application.status = "Certificate Issued";
//     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

//     await application.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment Successful — Smart Card Issued ✅",
//       data: application,
//     });
//   } catch (error) {
//     console.error("Payment Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // ═══════════════════════════════════════════════════════
// exports.getAllApplications = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
//     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
//     const { role, ward, id: userId } = req.user;

//     if (role === "citizen") {
//       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
//     }

//     const filter = {};

//     if (role === "vendor") {
//       // vendor ला फक्त स्वतःचे applications दिसतात
//       filter.createdById = userId;
//     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
//       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
//       if (!ward) {
//         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
//       }
//       filter.ward = ward;
//     }
//     // super_admin → कुठलाही filter नाही, सर्व दिसतात

//     if (status) filter.status = status;

//     const total = await VendorApplication.countDocuments(filter);
//     const applications = await VendorApplication.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       message: "Applications Fetched Successfully ✅",
//       data: applications,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     console.error("Get All Applications Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  10) GET APPLICATION BY NUMBER
// // ═══════════════════════════════════════════════════════
// exports.getApplicationByNo = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo });
//     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

//     return res.status(200).json({ success: true, data: application });
//   } catch (error) {
//     console.error("Get Application Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };

// // ═══════════════════════════════════════════════════════
// //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // ═══════════════════════════════════════════════════════
// exports.verifyCertificate = async (req, res) => {
//   try {
//     const { applicationNo } = req.params;
//     const application = await VendorApplication.findOne({ applicationNo }).select(
//       "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
//     );

//     if (!application || application.status !== "Certificate Issued") {
//       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
//     }

//     const isExpired = new Date() > new Date(application.certificate.validTill);

//     return res.status(200).json({
//       success: true,
//       valid: !isExpired,
//       data: application,
//     });
//   } catch (error) {
//     console.error("Verify Certificate Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };
// // ═══════════════════════════════════════════════════════
// //  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
// //      (parsed on the frontend into a plain JSON array; no documents are attached here —
// //      documents can be uploaded later via the normal Update flow)
// // ═══════════════════════════════════════════════════════

// // Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// // Returns "" if it cannot be resolved to one of the known wards.
// const normalizeWard = (raw) => {
//   if (!raw) return "";
//   const value = String(raw).trim();
//   if (!value) return "";

//   // Already a full, valid ward name (case-insensitive match)
//   const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
//   if (fullMatch) return fullMatch;

//   // Single letter like "I" or "i" → "Ward I"
//   if (/^[A-Za-z]$/.test(value)) {
//     const candidate = `Ward ${value.toUpperCase()}`;
//     if (WARDS.includes(candidate)) return candidate;
//   }

//   return "";
// };

// exports.bulkImportApplications = async (req, res) => {
//   try {
//     // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
//     // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
//     //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
//     const { rows } = req.body;

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "No rows to import ❌" });
//     }

//     // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
//     //    regardless of what the sheet says (same security principle as single create) ──
//     if (req.user.role === "counter_officer" && !req.user.ward) {
//       return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
//     }
//     const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

//     const created = [];
//     const skipped = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i] || {};
//       const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

//       const fullName = (row.name || "").toString().trim();
//       const rawMobile = (row.mobile || "").toString().trim();

//       // "NA", "N/A", "NaN", or anything with no digits at all is not a usable mobile number —
//       // treat it as missing, not as a real value to duplicate-check against.
//       const isInvalidMobile = !rawMobile || /^(na|n\/a|nan)$/i.test(rawMobile) || !/\d/.test(rawMobile);
//       const mobile = isInvalidMobile ? "" : rawMobile;

//       if (!fullName) {
//         skipped.push({ row: rowNum, reason: "Full name is required" });
//         continue;
//       }
//       if (!mobile) {
//         skipped.push({ row: rowNum, reason: "Mobile number is missing or invalid" });
//         continue;
//       }

//       // ── Duplicate check — same mobile number already in the system ──
//       const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
//       if (existing) {
//         skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
//         continue;
//       }

//       const finalWard = officerWard || normalizeWard(row.wardName) || "";

//       const applicationNo = await generateApplicationNo();
//       const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

//       const newApplication = new VendorApplication({
//         applicationNo,
//         vendorId,
//         personal: { fullName, mobile },
//         address: {
//           permanentAddress: (row.residenceAddress || "").toString().trim(),
//           currentAddress: (row.workingAddress || "").toString().trim(),
//           roadName: (row.roadName || "").toString().trim(),
//           serialNo: `SR${Date.now()}${i}`,
//           ward: finalWard,
//         },
//         business: {
//           businessType: (row.businessType || "").toString().trim(),
//           businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
//         },
//         ward: finalWard,
//         createdById: req.user?.id || "",
//         createdByName: req.user?.userName || "",
//         createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
//         counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
//         counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
//         status: "Draft",
//       });

//       pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
//       await newApplication.save();

//       created.push({ row: rowNum, applicationNo, vendorId, fullName });
//     }

//     return res.status(201).json({
//       success: true,
//       message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
//       createdCount: created.length,
//       skippedCount: skipped.length,
//       created,
//       skipped,
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
//   }
// };



const VendorApplication = require("../models/VendorApplication");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
const generateQrDataUrl = require("../utils/qrGenerator");
const { checkWardAccess } = require("../utils/wardAccess");
const { WARDS } = require("../utils/constants");

// ── Finds the vendor's real User account by mobile number, creating one if it doesn't exist yet
//    (e.g. when a Counter Officer registers a vendor who has never logged in themselves).
//    Default password = the mobile number itself; the vendor can log in with it right away
//    (via password login) or change it later, and can also still use OTP login anytime. ──
async function findOrCreateVendorUser({ mobile, fullName }) {
  if (!mobile) return null;
  let vendorUser = await User.findOne({ mobileNumber: mobile });
  if (!vendorUser) {
    const hashedPassword = await bcrypt.hash(mobile, 10);
    vendorUser = await User.create({
      fullName: fullName || "Vendor",
      userName: mobile,
      mobileNumber: mobile,
      password: hashedPassword,
      role: "vendor",
    });
  }
  return vendorUser;
}

// ── छोटा helper: statusHistory मध्ये entry push करा ──
const pushHistory = (application, status, user, remarks = "") => {
  application.statusHistory.push({
    status,
    changedById: user?.id || "",
    changedByName: user?.userName || "",
    changedByRole: user?.role || "",
    remarks,
  });
};

// ═══════════════════════════════════════════════════════
//  1) CREATE APPLICATION — vendor themselves OR counter officer on their behalf
// ═══════════════════════════════════════════════════════
exports.createApplication = async (req, res) => {
  try {
    const {
      personal,      // JSON string: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
      address,       // JSON string: { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, ward, zone }
      business,      // JSON string: { vendorType, businessType, businessPlace }
      ward,          // operational ward (Ward A - Ward I) — used for officer assignment/routing
      vendingLocation,
      isRenewal, previousApplicationNo,
    } = req.body;

    const personalData = personal ? JSON.parse(personal) : {};

    if (!personalData.fullName || !personalData.mobile) {
      return res.status(400).json({ success: false, message: "Full name and mobile number are required ❌" });
    }

    // ── Named document uploads from the frontend (photo, aadhaarCard, panCard, addressProof, businessProof) ──
    const documents = {
      photo: req.files?.photo?.[0]?.path || "",
      aadhaarCard: req.files?.aadhaarCard?.[0]?.path || "",
      panCard: req.files?.panCard?.[0]?.path || "",
      addressProof: req.files?.addressProof?.[0]?.path || "",
      businessProof: req.files?.businessProof?.[0]?.path || "",
    };

    const applicationNo = await generateApplicationNo();
    const vendorId = `VDR${Date.now()}`;

    // Who created it — the vendor themselves, or a counter officer filling it in on their behalf
    const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
    const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

    // ── Counter Officer is ward-scoped — they can only create applications for their own ward ──
    let finalWard = ward || "";
    if (createdByRole === "counter_officer") {
      if (!req.user.ward) {
        return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
      }
      finalWard = req.user.ward; // even if the client sends a different ward, the counter officer's own ward is used
    }

    // ── serialNo: backend-generated identifier for this address record (frontend does not collect it) ──
    const addressData = address ? JSON.parse(address) : {};
    if (!addressData.serialNo) {
      addressData.serialNo = `SR${Date.now()}`;
    }

    // ── When a Counter Officer creates this on the vendor's behalf, resolve (or auto-create)
    //    the vendor's own User account by mobile number, so the application is owned by the
    //    vendor from the start — this is what lets the vendor see/edit it once they log in,
    //    including after it's sent back for corrections. ──
    let ownerId = req.user?.id || "";
    let ownerName = req.user?.userName || personalData.fullName;
    if (createdByRole === "counter_officer") {
      const vendorUser = await findOrCreateVendorUser({
        mobile: personalData.mobile,
        fullName: personalData.fullName,
      });
      if (vendorUser) {
        ownerId = vendorUser._id.toString();
        ownerName = vendorUser.fullName;
      }
    }

    const newApplication = new VendorApplication({
      applicationNo,
      vendorId,
      personal: personalData,
      address: addressData,
      business: business ? JSON.parse(business) : {},
      documents,
      ward: finalWard,
      vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
      createdById: ownerId,
      createdByName: ownerName,
      createdByRole,
      counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
      counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
      status,
      isRenewal: !!isRenewal,
      previousApplicationNo: previousApplicationNo || "",
    });

    pushHistory(newApplication, status, req.user, "Application created");
    await newApplication.save();

    return res.status(201).json({
      success: true,
      message: "Application Created Successfully ✅",
      applicationNo,
      vendorId,
      data: newApplication,
    });
  } catch (error) {
    console.error("Create Application Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  2) SUBMIT APPLICATION — vendor draft submit करतो
// ═══════════════════════════════════════════════════════
exports.submitApplication = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    // ── Counter Officer submitting on the vendor's behalf can only do so for their own ward ──
    if (req.user.role === "counter_officer") {
      const wardCheck = checkWardAccess(req.user, application.ward);
      if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
    }

    if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
      return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
    }

    application.status = "Submitted";
    pushHistory(
      application,
      "Submitted",
      req.user,
      req.user.role === "counter_officer" ? "Submitted on vendor's behalf by Counter Officer" : "Vendor submitted application"
    );
    await application.save();

    return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
  } catch (error) {
    console.error("Submit Application Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  3) UPDATE APPLICATION — counter officer (edit access) can edit at any stage
// ═══════════════════════════════════════════════════════
exports.updateApplication = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    // ── Counter Officer can only edit applications in their own ward ──
    const wardCheck = checkWardAccess(req.user, application.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    // ── Vendor editing: only their own application (by createdById OR matching mobile —
    //    covers applications a counter officer filled in on their behalf), and only while
    //    it's still Draft or Sent Back ──
    if (req.user.role === "vendor") {
      const isOwnApplication =
        application.createdById === req.user.id ||
        (req.user.mobileNumber && application.personal?.mobile === req.user.mobileNumber);
      if (!isOwnApplication) {
        return res.status(403).json({ success: false, message: "You can only edit your own application ❌" });
      }
      if (!["Draft", "Sent Back to Vendor"].includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: "You can only edit your application while it's in Draft or Sent Back status ❌",
        });
      }
    }

    const oldWard = application.ward;

    // ── Nested groups (sent as JSON strings, merged with existing values) ──
    // personal: { fullName, fatherName (optional), dob, gender, mobile, email, aadhaar, pan, category }
    // address:  { permanentAddress (RESIDENCE ADDRESS), currentAddress (Working Address), roadName, serialNo, ward, zone }
    // business: { vendorType, businessType, businessPlace }
    if (req.body.personal) {
      application.personal = { ...(application.personal?.toObject?.() || application.personal || {}), ...JSON.parse(req.body.personal) };
    }
    if (req.body.address) {
      application.address = { ...(application.address?.toObject?.() || application.address || {}), ...JSON.parse(req.body.address) };
    }
    if (req.body.business) {
      application.business = { ...(application.business?.toObject?.() || application.business || {}), ...JSON.parse(req.body.business) };
    }

    // ── Operational ward (Ward A - Ward I) — used for officer routing, separate from address.ward ──
    if (req.body.ward !== undefined) application.ward = req.body.ward;

    // ── Log the zone change in history (a different officer will now be responsible) ──
    if (req.body.ward && req.body.ward !== oldWard) {
      pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
    }

    if (req.body.vendingLocation) {
      application.vendingLocation = JSON.parse(req.body.vendingLocation);
    }

    // ── Named document re-upload (any one or more documents can be re-uploaded) ──
    const docFields = ["photo", "aadhaarCard", "panCard", "addressProof", "businessProof"];
    docFields.forEach((field) => {
      if (req.files?.[field]?.[0]) {
        application.documents = application.documents || {};
        application.documents[field] = req.files[field][0].path;
      }
    });

    pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
    await application.save();

    return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
  } catch (error) {
    console.error("Update Application Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// ═══════════════════════════════════════════════════════
exports.sendBackToVendor = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { remarks } = req.body;

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    const wardCheck = checkWardAccess(req.user, application.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    application.status = "Sent Back to Vendor";
    application.counterOfficerRemarks = remarks || "";
    pushHistory(application, "Sent Back to Vendor", req.user, remarks);
    await application.save();

    return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
  } catch (error) {
    console.error("Send Back Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  5) FORWARD TO SURVEY OFFICER — counter officer
// ═══════════════════════════════════════════════════════
exports.forwardToSurveyOfficer = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { ward } = req.body;

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
    const wardCheck = checkWardAccess(req.user, application.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
      return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
    }

    if (ward && ward !== application.ward) {
      pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
      application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
    }
    application.counterOfficerId = req.user?.id || application.counterOfficerId;
    application.counterOfficerName = req.user?.userName || application.counterOfficerName;
    application.status = "Forwarded to Survey Officer";

    pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
    await application.save();

    return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
  } catch (error) {
    console.error("Forward Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// ═══════════════════════════════════════════════════════
exports.updateSurvey = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { lat, lng, comments, recommendation, ward } = req.body;

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
    const wardCheck = checkWardAccess(req.user, application.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    if (application.status !== "Forwarded to Survey Officer") {
      return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
    }

    const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

    application.survey = {
      geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
      surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
      comments: comments || application.survey?.comments || "",
      recommendation: recommendation || "",
      surveyOfficerId: req.user?.id || "",
      surveyOfficerName: req.user?.userName || "",
      surveyDate: new Date(),
    };

    if (ward && ward !== application.ward) {
      pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
      application.ward = ward; // survey officer ला पण zone change करता येतो
    }

    // ── Recommendation नुसार पुढे पाठवा ──
    if (recommendation === "Approve") {
      application.status = "Forwarded to A.M.C.";
      pushHistory(application, "Forwarded to A.M.C.", req.user, "Survey approved — forwarded to ward A.M.C.");
    } else if (recommendation === "Send Back") {
      application.status = "Sent Back to Counter Officer";
      pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
    } else {
      pushHistory(application, application.status, req.user, "Survey details updated");
    }

    await application.save();

    return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
  } catch (error) {
    console.error("Update Survey Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  7) A.M.C. DECISION — Ward-wise final approval
// ═══════════════════════════════════════════════════════
exports.amcDecision = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    if (application.status !== "Forwarded to A.M.C.") {
      return res.status(400).json({ success: false, message: "Application A.M.C. stage मध्ये नाही ❌" });
    }

    // ── A.M.C. फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
    const wardCheck = checkWardAccess(req.user, application.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    application.amcAction = {
      officerId: req.user?.id || "",
      officerName: req.user?.userName || "",
      ward: application.ward,
      remarks: remarks || "",
      decision,
      actionDate: new Date(),
    };

    if (decision === "Approved") {
      application.status = "A.M.C. Approved";
      application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
      pushHistory(application, "A.M.C. Approved", req.user, remarks);
      // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
      application.status = "Payment Pending";
      pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
    } else if (decision === "Sent Back") {
      application.status = "Sent Back to Counter Officer";
      pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "A.M.C. found issues");
    } else if (decision === "Rejected") {
      application.status = "Rejected";
      pushHistory(application, "Rejected", req.user, remarks);
    }

    await application.save();

    return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
  } catch (error) {
    console.error("A.M.C. Decision Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// ═══════════════════════════════════════════════════════
exports.recordPayment = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { amount, transactionId, receiptUrl } = req.body;

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    if (application.status !== "Payment Pending") {
      return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
    }

    application.payment = {
      amount: amount || application.payment?.amount || 0,
      status: "Paid",
      transactionId: transactionId || "",
      paidDate: new Date(),
      receiptUrl: receiptUrl || "",
    };
    application.status = "Payment Done";
    pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

    // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
    const certificateNo = await generateCertificateNo();
    const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

    const issueDate = new Date();
    const validTill = new Date();
    validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

    application.certificate = {
      certificateNo,
      qrCodeData: verifyUrl,
      qrCodeUrl: qrDataUrl,
      issueDate,
      validTill,
    };
    application.status = "Certificate Issued";
    pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Payment Successful — Smart Card Issued ✅",
      data: application,
    });
  } catch (error) {
    console.error("Payment Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// ═══════════════════════════════════════════════════════
exports.getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
    // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
    const { role, ward, id: userId, mobileNumber } = req.user;

    if (role === "citizen") {
      return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
    }

    const filter = {};

    if (role === "vendor") {
      // vendor ला स्वतः submit केलेले (createdById match) आणि counter officer ने त्याच्या
      // वतीने बनवलेले (मोबाईल नंबर match) — दोन्ही प्रकारचे applications दिसायला हवेत.
      const orConditions = [{ createdById: userId }];
      if (mobileNumber) orConditions.push({ "personal.mobile": mobileNumber });
      filter.$or = orConditions;
    } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
      // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
      if (!ward) {
        return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
      }
      filter.ward = ward;
    }
    // super_admin → कुठलाही filter नाही, सर्व दिसतात

    if (status) filter.status = status;

    const total = await VendorApplication.countDocuments(filter);
    const applications = await VendorApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: "Applications Fetched Successfully ✅",
      data: applications,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get All Applications Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  10) GET APPLICATION BY NUMBER
// ═══════════════════════════════════════════════════════
exports.getApplicationByNo = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error("Get Application Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// ═══════════════════════════════════════════════════════
exports.verifyCertificate = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const application = await VendorApplication.findOne({ applicationNo }).select(
      "applicationNo vendorId personal.fullName business address ward vendingLocation certificate status documents.photo"
    );

    if (!application || application.status !== "Certificate Issued") {
      return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
    }

    const isExpired = new Date() > new Date(application.certificate.validTill);

    return res.status(200).json({
      success: true,
      valid: !isExpired,
      data: application,
    });
  } catch (error) {
    console.error("Verify Certificate Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};
// ═══════════════════════════════════════════════════════
//  12) BULK IMPORT — Counter Officer imports many vendors at once from an Excel/CSV file
//      (parsed on the frontend into a plain JSON array; no documents are attached here —
//      documents can be uploaded later via the normal Update flow)
// ═══════════════════════════════════════════════════════

// Accepts "I", "i", "Ward I", "ward i" etc. and normalizes to the canonical "Ward I" form.
// Returns "" if it cannot be resolved to one of the known wards.
const normalizeWard = (raw) => {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";

  // Already a full, valid ward name (case-insensitive match)
  const fullMatch = WARDS.find((w) => w.toLowerCase() === value.toLowerCase());
  if (fullMatch) return fullMatch;

  // Single letter like "I" or "i" → "Ward I"
  if (/^[A-Za-z]$/.test(value)) {
    const candidate = `Ward ${value.toUpperCase()}`;
    if (WARDS.includes(candidate)) return candidate;
  }

  return "";
};

exports.bulkImportApplications = async (req, res) => {
  try {
    // rows: array of plain objects parsed on the frontend from the uploaded Excel/CSV.
    // Expected keys per row (case/spacing tolerant, mapped on the frontend before sending):
    //   name, mobile, residenceAddress, workingAddress, wardName, roadName, businessType, businessPlace
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No rows to import ❌" });
    }

    // ── Counter Officer is ward-scoped — every bulk-imported record goes into their own ward,
    //    regardless of what the sheet says (same security principle as single create) ──
    if (req.user.role === "counter_officer" && !req.user.ward) {
      return res.status(403).json({ success: false, message: "Your account has no ward assigned ❌" });
    }
    const officerWard = req.user.role === "counter_officer" ? req.user.ward : "";

    const created = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const rowNum = i + 2; // +2 → account for header row + 1-indexing, matches the spreadsheet row number

      const fullName = (row.name || "").toString().trim();
      const rawMobile = (row.mobile || "").toString().trim();

      // "NA", "N/A", "NaN", or anything with no digits at all is not a usable mobile number —
      // treat it as missing, not as a real value to duplicate-check against.
      const isInvalidMobile = !rawMobile || /^(na|n\/a|nan)$/i.test(rawMobile) || !/\d/.test(rawMobile);
      const mobile = isInvalidMobile ? "" : rawMobile;

      if (!fullName) {
        skipped.push({ row: rowNum, reason: "Full name is required" });
        continue;
      }
      if (!mobile) {
        skipped.push({ row: rowNum, reason: "Mobile number is missing or invalid" });
        continue;
      }

      // ── Duplicate check — same mobile number already in the system ──
      const existing = await VendorApplication.findOne({ "personal.mobile": mobile });
      if (existing) {
        skipped.push({ row: rowNum, reason: `Mobile ${mobile} already exists (applicationNo: ${existing.applicationNo})` });
        continue;
      }

      const finalWard = officerWard || normalizeWard(row.wardName) || "";

      const applicationNo = await generateApplicationNo();
      const vendorId = `VDR${Date.now()}${i}`; // `i` avoids collisions when many rows are created in the same millisecond

      // ── Same as the single-create flow: resolve/auto-create the vendor's own User account
      //    by mobile number, so this row is owned by the actual vendor, not the officer. ──
      let ownerId = req.user?.id || "";
      let ownerName = req.user?.userName || "";
      if (req.user?.role === "counter_officer") {
        const vendorUser = await findOrCreateVendorUser({ mobile, fullName });
        if (vendorUser) {
          ownerId = vendorUser._id.toString();
          ownerName = vendorUser.fullName;
        }
      }

      const newApplication = new VendorApplication({
        applicationNo,
        vendorId,
        personal: { fullName, mobile },
        address: {
          permanentAddress: (row.residenceAddress || "").toString().trim(),
          currentAddress: (row.workingAddress || "").toString().trim(),
          roadName: (row.roadName || "").toString().trim(),
          serialNo: `SR${Date.now()}${i}`,
          ward: finalWard,
        },
        business: {
          businessType: (row.businessType || "").toString().trim(),
          businessPlace: (row.businessPlace || "Foot Path").toString().trim(),
        },
        ward: finalWard,
        createdById: ownerId,
        createdByName: ownerName,
        createdByRole: req.user?.role === "counter_officer" ? "counter_officer" : "vendor",
        counterOfficerId: req.user?.role === "counter_officer" ? req.user.id : "",
        counterOfficerName: req.user?.role === "counter_officer" ? req.user.userName : "",
        status: "Draft",
      });

      pushHistory(newApplication, "Draft", req.user, `Bulk imported from spreadsheet (row ${rowNum})`);
      await newApplication.save();

      created.push({ row: rowNum, applicationNo, vendorId, fullName });
    }

    return res.status(201).json({
      success: true,
      message: `Bulk import finished — ${created.length} created, ${skipped.length} skipped ✅`,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    });
  } catch (error) {
    console.error("Bulk Import Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};
// ═══════════════════════════════════════════════════════
//  13) EMERGENCY — Counter Officer bypass: Survey → A.M.C. → Payment, straight to
//      Certificate Issued. TEMPORARY shortcut for urgent situations only — the normal
//      Survey/A.M.C./Payment flow above is untouched and remains the default path for
//      everyone else. Only "counter_officer" and "super_admin" can use this.
// ═══════════════════════════════════════════════════════
exports.emergencyIssueCertificate = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { remarks } = req.body;

    const application = await VendorApplication.findOne({ applicationNo });
    if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

    // ── Counter Officer can only do this for applications in their own ward ──
    if (req.user.role === "counter_officer") {
      const wardCheck = checkWardAccess(req.user, application.ward);
      if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });
    }

    // ── Only makes sense once the vendor has actually submitted — same starting points as
    //    the normal "Forward to Survey Officer" action, plus already-in-progress stages so
    //    it can rescue a stuck application at any point before the certificate exists. ──
    const allowedFrom = [
      "Submitted",
      "Sent Back to Counter Officer",
      "Forwarded to Survey Officer",
      "Survey Approved",
      "Forwarded to A.M.C.",
      "A.M.C. Approved",
      "Payment Pending",
    ];
    if (!allowedFrom.includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Emergency issue not available from status "${application.status}" ❌`,
      });
    }

    if (application.status === "Certificate Issued") {
      return res.status(400).json({ success: false, message: "Certificate already issued for this application ❌" });
    }

    const note = remarks?.trim() || "Emergency bypass by Counter Officer";

    // ── Skip Survey / A.M.C. / Payment — mark them administratively complete so the
    //    history trail stays honest about what actually happened ──
    application.payment = {
      amount: application.payment?.amount || 0,
      status: "Paid",
      transactionId: "EMERGENCY-BYPASS",
      paidDate: new Date(),
      receiptUrl: "",
    };
    application.status = "Payment Done";
    pushHistory(application, "Payment Done", req.user, `Emergency bypass — ${note}`);

    // ── Same certificate-generation logic as the normal payment flow ──
    const certificateNo = await generateCertificateNo();
    const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

    const issueDate = new Date();
    const validTill = new Date();
    validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

    application.certificate = {
      certificateNo,
      qrCodeData: verifyUrl,
      qrCodeUrl: qrDataUrl,
      issueDate,
      validTill,
    };
    application.status = "Certificate Issued";
    pushHistory(application, "Certificate Issued", req.user, `Emergency Certificate No: ${certificateNo} — ${note}`);

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Emergency Smart Card Issued ✅",
      data: application,
    });
  } catch (error) {
    console.error("Emergency Issue Certificate Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};