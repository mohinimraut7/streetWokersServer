// // const VendorApplication = require("../models/VendorApplication");
// // const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
// // const generateQrDataUrl = require("../utils/qrGenerator");
// // const { checkWardAccess } = require("../utils/wardAccess");

// // // ── छोटा helper: statusHistory मध्ये entry push करा ──
// // const pushHistory = (application, status, user, remarks = "") => {
// //   application.statusHistory.push({
// //     status,
// //     changedById: user?.id || "",
// //     changedByName: user?.userName || "",
// //     changedByRole: user?.role || "",
// //     remarks,
// //   });
// // };

// // // ═══════════════════════════════════════════════════════
// // //  1) CREATE APPLICATION — vendor स्वतः किंवा counter officer त्यांच्या वतीने
// // // ═══════════════════════════════════════════════════════
// // exports.createApplication = async (req, res) => {
// //   try {
// //     const {
// //       fullName, mobile, email, address, identityType, identityNumber,
// //       businessName, businessType, ward, vendingLocation,
// //       isRenewal, previousApplicationNo,
// //     } = req.body;

// //     if (!fullName || !mobile) {
// //       return res.status(400).json({ success: false, message: "Full name आणि mobile number आवश्यक ❌" });
// //     }

// //     const documentPaths = (req.files?.documents || []).map((f) => ({ docType: "document", url: f.path }));
// //     const vendorPhotoPath = req.files?.vendorPhoto?.[0]?.path || "";

// //     const applicationNo = await generateApplicationNo();

// //     // कोणी create केला — vendor स्वतः की counter officer त्यांच्या वतीने
// //     const createdByRole = req.user?.role === "counter_officer" ? "counter_officer" : "vendor";
// //     const status = createdByRole === "counter_officer" ? "Submitted" : "Draft";

// //     // ── Counter Officer ward-wise असतो — तो फक्त स्वतःच्या ward साठीच application बनवू शकतो ──
// //     let finalWard = ward || "";
// //     if (createdByRole === "counter_officer") {
// //       if (!req.user.ward) {
// //         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
// //       }
// //       finalWard = req.user.ward; // client ने वेगळा ward पाठवला तरी counter officer चा स्वतःचा ward च वापरला जातो
// //     }

// //     const newApplication = new VendorApplication({
// //       applicationNo,
// //       fullName, mobile, email, address, identityType, identityNumber,
// //       businessName, businessType,
// //       ward: finalWard,
// //       vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
// //       documents: documentPaths,
// //       vendorPhoto: vendorPhotoPath,
// //       createdById: req.user?.id || "",
// //       createdByName: req.user?.userName || fullName,
// //       createdByRole,
// //       counterOfficerId: createdByRole === "counter_officer" ? req.user.id : "",
// //       counterOfficerName: createdByRole === "counter_officer" ? req.user.userName : "",
// //       status,
// //       isRenewal: !!isRenewal,
// //       previousApplicationNo: previousApplicationNo || "",
// //     });

// //     pushHistory(newApplication, status, req.user, "Application created");
// //     await newApplication.save();

// //     return res.status(201).json({
// //       success: true,
// //       message: "Application Created Successfully ✅",
// //       applicationNo,
// //       data: newApplication,
// //     });
// //   } catch (error) {
// //     console.error("Create Application Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  2) SUBMIT APPLICATION — vendor draft submit करतो
// // // ═══════════════════════════════════════════════════════
// // exports.submitApplication = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
// //       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
// //     }

// //     application.status = "Submitted";
// //     pushHistory(application, "Submitted", req.user, "Vendor submitted application");
// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Application Submitted ✅", data: application });
// //   } catch (error) {
// //     console.error("Submit Application Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  3) UPDATE APPLICATION — counter officer (edit access) कधीही edit करू शकतो
// // // ═══════════════════════════════════════════════════════
// // exports.updateApplication = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     // ── Counter Officer फक्त स्वतःच्या ward च्या applications edit करू शकतो ──
// //     const wardCheck = checkWardAccess(req.user, application.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     const oldWard = application.ward;

// //     const editableFields = [
// //       "fullName", "mobile", "email", "address", "identityType", "identityNumber",
// //       "businessName", "businessType", "ward",
// //     ];
// //     editableFields.forEach((field) => {
// //       if (req.body[field] !== undefined) application[field] = req.body[field];
// //     });

// //     // ── Zone change झाल्यास history मध्ये नोंद (नवीन ward साठी आता वेगळा officer जबाबदार असेल) ──
// //     if (req.body.ward && req.body.ward !== oldWard) {
// //       pushHistory(application, application.status, req.user, `Zone changed from ${oldWard || "—"} to ${req.body.ward}`);
// //     }

// //     if (req.body.vendingLocation) {
// //       application.vendingLocation = JSON.parse(req.body.vendingLocation);
// //     }

// //     if (req.files?.documents?.length) {
// //       const newDocs = req.files.documents.map((f) => ({ docType: "document", url: f.path }));
// //       application.documents.push(...newDocs);
// //     }
// //     if (req.files?.vendorPhoto?.[0]) {
// //       application.vendorPhoto = req.files.vendorPhoto[0].path;
// //     }

// //     pushHistory(application, application.status, req.user, "Application edited by " + (req.user?.role || ""));
// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Application Updated Successfully ✅", data: application });
// //   } catch (error) {
// //     console.error("Update Application Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  4) SEND BACK TO VENDOR — counter officer, corrections साठी
// // // ═══════════════════════════════════════════════════════
// // exports.sendBackToVendor = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const { remarks } = req.body;

// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     const wardCheck = checkWardAccess(req.user, application.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     application.status = "Sent Back to Vendor";
// //     application.counterOfficerRemarks = remarks || "";
// //     pushHistory(application, "Sent Back to Vendor", req.user, remarks);
// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Application Sent Back to Vendor ✅", data: application });
// //   } catch (error) {
// //     console.error("Send Back Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  5) FORWARD TO SURVEY OFFICER — counter officer
// // // ═══════════════════════════════════════════════════════
// // exports.forwardToSurveyOfficer = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const { ward } = req.body;

// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     // ── Counter Officer फक्त स्वतःच्या ward च्या applications forward करू शकतो ──
// //     const wardCheck = checkWardAccess(req.user, application.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     if (application.status !== "Submitted" && application.status !== "Sent Back to Counter Officer") {
// //       return res.status(400).json({ success: false, message: "Application योग्य status मध्ये नाही ❌" });
// //     }

// //     if (ward && ward !== application.ward) {
// //       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
// //       application.ward = ward; // zone change feature — कोणत्याही टप्प्यावर update करता येते
// //     }
// //     application.counterOfficerId = req.user?.id || application.counterOfficerId;
// //     application.counterOfficerName = req.user?.userName || application.counterOfficerName;
// //     application.status = "Forwarded to Survey Officer";

// //     pushHistory(application, "Forwarded to Survey Officer", req.user, "Forwarded for field survey");
// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Application Forwarded to Survey Officer ✅", data: application });
// //   } catch (error) {
// //     console.error("Forward Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  6) UPDATE SURVEY — Survey Officer: geo location, photos, comments, recommendation
// // // ═══════════════════════════════════════════════════════
// // exports.updateSurvey = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const { lat, lng, comments, recommendation, ward } = req.body;

// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     // ── Survey Officer फक्त स्वतःच्या ward च्या applications survey करू शकतो ──
// //     const wardCheck = checkWardAccess(req.user, application.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     if (application.status !== "Forwarded to Survey Officer") {
// //       return res.status(400).json({ success: false, message: "Application survey stage मध्ये नाही ❌" });
// //     }

// //     const newPhotos = (req.files?.surveyPhotos || []).map((f) => f.path);

// //     application.survey = {
// //       geoLocation: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
// //       surveyPhotos: [...(application.survey?.surveyPhotos || []), ...newPhotos],
// //       comments: comments || application.survey?.comments || "",
// //       recommendation: recommendation || "",
// //       surveyOfficerId: req.user?.id || "",
// //       surveyOfficerName: req.user?.userName || "",
// //       surveyDate: new Date(),
// //     };

// //     if (ward && ward !== application.ward) {
// //       pushHistory(application, application.status, req.user, `Zone changed from ${application.ward || "—"} to ${ward}`);
// //       application.ward = ward; // survey officer ला पण zone change करता येतो
// //     }

// //     // ── Recommendation नुसार पुढे पाठवा ──
// //     if (recommendation === "Approve") {
// //       application.status = "Forwarded to Concern Officer";
// //       pushHistory(application, "Forwarded to Concern Officer", req.user, "Survey approved — forwarded to ward AMC");
// //     } else if (recommendation === "Send Back") {
// //       application.status = "Sent Back to Counter Officer";
// //       pushHistory(application, "Sent Back to Counter Officer", req.user, comments || "Survey found issues");
// //     } else {
// //       pushHistory(application, application.status, req.user, "Survey details updated");
// //     }

// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Survey Updated Successfully ✅", data: application });
// //   } catch (error) {
// //     console.error("Update Survey Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  7) CONCERN OFFICER DECISION — Ward-wise A.M.C. final approval
// // // ═══════════════════════════════════════════════════════
// // exports.concernOfficerDecision = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const { decision, remarks } = req.body; // decision: "Approved" | "Sent Back" | "Rejected"

// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     if (application.status !== "Forwarded to Concern Officer") {
// //       return res.status(400).json({ success: false, message: "Application concern officer stage मध्ये नाही ❌" });
// //     }

// //     // ── Concern Officer (Ward-wise A.M.C.) फक्त स्वतःच्या ward च्या applications वर decision घेऊ शकतो ──
// //     const wardCheck = checkWardAccess(req.user, application.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     application.concernOfficerAction = {
// //       officerId: req.user?.id || "",
// //       officerName: req.user?.userName || "",
// //       ward: application.ward,
// //       remarks: remarks || "",
// //       decision,
// //       actionDate: new Date(),
// //     };

// //     if (decision === "Approved") {
// //       application.status = "Concern Officer Approved";
// //       application.payment = { ...application.payment, status: "Pending", amount: application.payment?.amount || 500 };
// //       pushHistory(application, "Concern Officer Approved", req.user, remarks);
// //       // Approve नंतर लगेच Payment Pending स्थितीत टाकतो
// //       application.status = "Payment Pending";
// //       pushHistory(application, "Payment Pending", req.user, "Awaiting vendor payment");
// //     } else if (decision === "Sent Back") {
// //       application.status = "Sent Back to Counter Officer";
// //       pushHistory(application, "Sent Back to Counter Officer", req.user, remarks || "Concern officer found issues");
// //     } else if (decision === "Rejected") {
// //       application.status = "Rejected";
// //       pushHistory(application, "Rejected", req.user, remarks);
// //     }

// //     await application.save();

// //     return res.status(200).json({ success: true, message: "Decision Recorded ✅", data: application });
// //   } catch (error) {
// //     console.error("Concern Officer Decision Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  8) PAYMENT — vendor payment करतो, नंतर QR certificate generate होतो
// // // ═══════════════════════════════════════════════════════
// // exports.recordPayment = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const { amount, transactionId, receiptUrl } = req.body;

// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     if (application.status !== "Payment Pending") {
// //       return res.status(400).json({ success: false, message: "Application payment stage मध्ये नाही ❌" });
// //     }

// //     application.payment = {
// //       amount: amount || application.payment?.amount || 0,
// //       status: "Paid",
// //       transactionId: transactionId || "",
// //       paidDate: new Date(),
// //       receiptUrl: receiptUrl || "",
// //     };
// //     application.status = "Payment Done";
// //     pushHistory(application, "Payment Done", req.user, `Payment received: ${transactionId || ""}`);

// //     // ── Payment झाल्यावर लगेच QR Smart Card generate करा ──
// //     const certificateNo = await generateCertificateNo();
// //     const { verifyUrl, qrDataUrl } = await generateQrDataUrl(application.applicationNo);

// //     const issueDate = new Date();
// //     const validTill = new Date();
// //     validTill.setFullYear(validTill.getFullYear() + 1); // 1 वर्ष validity

// //     application.certificate = {
// //       certificateNo,
// //       qrCodeData: verifyUrl,
// //       qrCodeUrl: qrDataUrl,
// //       issueDate,
// //       validTill,
// //     };
// //     application.status = "Certificate Issued";
// //     pushHistory(application, "Certificate Issued", req.user, `Certificate No: ${certificateNo}`);

// //     await application.save();

// //     return res.status(200).json({
// //       success: true,
// //       message: "Payment Successful — Smart Card Issued ✅",
// //       data: application,
// //     });
// //   } catch (error) {
// //     console.error("Payment Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  9) GET ALL APPLICATIONS — role व ward नुसार filter (pagination सहित)
// // // ═══════════════════════════════════════════════════════
// // exports.getAllApplications = async (req, res) => {
// //   try {
// //     const { status, page = 1, limit = 20 } = req.query;
// //     const pageNum = parseInt(page);
// //     const limitNum = parseInt(limit);
// //     const skip = (pageNum - 1) * limitNum;

// //     // ── req.query वरून role/ward/userId कधीच घ्यायचे नाहीत (client manipulate करू शकतो) ──
// //     // ── नेहमी logged-in user च्या JWT (req.user) वरून ठरवायचे — हाच खरा security fix आहे ──
// //     const { role, ward, id: userId } = req.user;

// //     if (role === "citizen") {
// //       return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
// //     }

// //     const filter = {};

// //     if (role === "vendor") {
// //       // vendor ला फक्त स्वतःचे applications दिसतात
// //       filter.createdById = userId;
// //     } else if (["counter_officer", "survey_officer", "A.M.C."].includes(role)) {
// //       // officers ला फक्त त्यांच्याच स्वतःच्या ward च्या applications दिसतात — query param वरून नाही
// //       if (!ward) {
// //         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
// //       }
// //       filter.ward = ward;
// //     }
// //     // super_admin → कुठलाही filter नाही, सर्व दिसतात

// //     if (status) filter.status = status;

// //     const total = await VendorApplication.countDocuments(filter);
// //     const applications = await VendorApplication.find(filter)
// //       .sort({ createdAt: -1 })
// //       .skip(skip)
// //       .limit(limitNum);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Applications Fetched Successfully ✅",
// //       data: applications,
// //       total,
// //       page: pageNum,
// //       totalPages: Math.ceil(total / limitNum),
// //     });
// //   } catch (error) {
// //     console.error("Get All Applications Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  10) GET APPLICATION BY NUMBER
// // // ═══════════════════════════════════════════════════════
// // exports.getApplicationByNo = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const application = await VendorApplication.findOne({ applicationNo });
// //     if (!application) return res.status(404).json({ success: false, message: "Application not found ❌" });

// //     return res.status(200).json({ success: true, data: application });
// //   } catch (error) {
// //     console.error("Get Application Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  11) VERIFY CERTIFICATE — PUBLIC route, QR scan केल्यावर उघडते (login आवश्यक नाही)
// // // ═══════════════════════════════════════════════════════
// // exports.verifyCertificate = async (req, res) => {
// //   try {
// //     const { applicationNo } = req.params;
// //     const application = await VendorApplication.findOne({ applicationNo }).select(
// //       "applicationNo fullName businessName businessType ward vendingLocation certificate status vendorPhoto"
// //     );

// //     if (!application || application.status !== "Certificate Issued") {
// //       return res.status(404).json({ success: false, message: "Valid certificate not found ❌" });
// //     }

// //     const isExpired = new Date() > new Date(application.certificate.validTill);

// //     return res.status(200).json({
// //       success: true,
// //       valid: !isExpired,
// //       data: application,
// //     });
// //   } catch (error) {
// //     console.error("Verify Certificate Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };






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

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(application, "Submitted", req.user, "Vendor submitted application");
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

// ============================================



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

//     if (application.status !== "Draft" && application.status !== "Sent Back to Vendor") {
//       return res.status(400).json({ success: false, message: "फक्त Draft किंवा Sent Back application submit करता येते ❌" });
//     }

//     application.status = "Submitted";
//     pushHistory(application, "Submitted", req.user, "Vendor submitted application");
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



// ======================================================================================

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


// ==========================================================

const VendorApplication = require("../models/VendorApplication");
const { generateApplicationNo, generateCertificateNo } = require("../utils/generateNumbers");
const generateQrDataUrl = require("../utils/qrGenerator");
const { checkWardAccess } = require("../utils/wardAccess");

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
      personal,      // JSON string: { fullName, fatherName, dob, gender, mobile, email, aadhaar, pan, category }
      address,       // JSON string: { permanentAddress, currentAddress, ward, zone }
      business,      // JSON string: { vendorType, businessCategory, goodsType, businessTiming, yearsExperience }
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

    const newApplication = new VendorApplication({
      applicationNo,
      vendorId,
      personal: personalData,
      address: address ? JSON.parse(address) : {},
      business: business ? JSON.parse(business) : {},
      documents,
      ward: finalWard,
      vendingLocation: vendingLocation ? JSON.parse(vendingLocation) : {},
      createdById: req.user?.id || "",
      createdByName: req.user?.userName || personalData.fullName,
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

    // ── Vendor editing: only their own application, and only while it's still Draft or Sent Back ──
    if (req.user.role === "vendor") {
      if (application.createdById !== req.user.id) {
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
    const { role, ward, id: userId } = req.user;

    if (role === "citizen") {
      return res.status(403).json({ success: false, message: "Citizen ला vendor applications बघता येत नाहीत ❌" });
    }

    const filter = {};

    if (role === "vendor") {
      // vendor ला फक्त स्वतःचे applications दिसतात
      filter.createdById = userId;
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