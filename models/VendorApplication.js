// const mongoose = require("mongoose");
// const { WARDS, APPLICATION_STATUS } = require("../utils/constants");

// // ── Status History (प्रत्येक status change track करण्यासाठी) ──
// const statusHistorySchema = new mongoose.Schema(
//   {
//     status: { type: String, required: true },
//     changedById: { type: String, default: "" },
//     changedByName: { type: String, default: "" },
//     changedByRole: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// // ── Survey Details (Survey Officer भरतो) ──
// const surveySchema = new mongoose.Schema(
//   {
//     geoLocation: { lat: { type: Number }, lng: { type: Number } },
//     surveyPhotos: [{ type: String }],
//     comments: { type: String, default: "" },
//     recommendation: { type: String, enum: ["Approve", "Send Back", ""], default: "" },
//     surveyOfficerId: { type: String, default: "" },
//     surveyOfficerName: { type: String, default: "" },
//     surveyDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── A.M.C. (Ward-wise) Action ──
// const amcActionSchema = new mongoose.Schema(
//   {
//     officerId: { type: String, default: "" },
//     officerName: { type: String, default: "" },
//     ward: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//     decision: { type: String, enum: ["Approved", "Sent Back", "Rejected", ""], default: "" },
//     actionDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── Payment ──
// const paymentSchema = new mongoose.Schema(
//   {
//     amount: { type: Number, default: 0 },
//     status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
//     transactionId: { type: String, default: "" },
//     paidDate: { type: Date },
//     receiptUrl: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Certificate (QR) ──
// const certificateSchema = new mongoose.Schema(
//   {
//     certificateNo: { type: String, default: "" },
//     qrCodeData: { type: String, default: "" },
//     qrCodeUrl: { type: String, default: "" },
//     issueDate: { type: Date },
//     validTill: { type: Date },
//   },
//   { _id: false }
// );

// // ══════════════════════════════════════════════════════════
// //  खालचे 4 sub-schema frontend च्या vendorsSlice.js / vendors.json
// //  शी EXACT जुळतात — personal / address / business / documents
// // ══════════════════════════════════════════════════════════

// // ── Step1Personal.jsx नुसार (field names तसेच ठेवले: aadhaar, pan) ──
// const personalSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     fatherName: { type: String, default: "" },
//     dob: { type: String, default: "" },
//     gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
//     mobile: { type: String, required: true },
//     email: { type: String, default: "" },
//     aadhaar: { type: String, default: "" },
//     pan: { type: String, default: "" },
//     category: { type: String, enum: ["General", "OBC", "SC", "ST", "EWS", ""], default: "" },
//   },
//   { _id: false }
// );

// // ── Step2Address.jsx नुसार ──
// // टीप: हा address.ward frontend dummy मध्ये "Ward 1".."Ward 15" फॉरमॅट आहे (vendor स्वतः निवडतो).
// // खालचा top-level `ward` (Ward A - Ward I) वेगळा आहे — तो officer-assignment साठी operational field आहे.
// const addressSchema = new mongoose.Schema(
//   {
//     permanentAddress: { type: String, default: "" },
//     currentAddress: { type: String, default: "" },
//     ward: { type: String, default: "" },
//     zone: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step3Business.jsx नुसार ──
// const businessSchema = new mongoose.Schema(
//   {
//     vendorType: { type: String, default: "" },
//     businessCategory: { type: String, default: "" },
//     goodsType: { type: String, default: "" },
//     businessTiming: { type: String, default: "" },
//     yearsExperience: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step4Documents.jsx नुसार (named uploads) ──
// const documentsSchema = new mongoose.Schema(
//   {
//     photo: { type: String, default: "" },
//     aadhaarCard: { type: String, default: "" },
//     panCard: { type: String, default: "" },
//     addressProof: { type: String, default: "" },
//     businessProof: { type: String, default: "" },
//   },
//   { _id: false }
// );

// const vendorApplicationSchema = new mongoose.Schema(
//   {
//     applicationNo: { type: String, unique: true, required: true },
//     vendorId: { type: String, default: "" }, // frontend cha short id (उदा. VDR2024001239)

//     // ── frontend शी exact जुळणारे 4 nested groups ──
//     personal: personalSchema,
//     address: addressSchema,
//     business: businessSchema,
//     documents: documentsSchema,

//     // ── Ward (operational — officer-assignment साठी, Ward A - Ward I) ──
//     // counter_officer / survey_officer / A.M.C. यांचं ward-wise routing यावरच चालतं
//     ward: { type: String, enum: [...WARDS, ""], default: "" },
//     vendingLocation: {
//       address: { type: String, default: "" },
//       lat: { type: Number },
//       lng: { type: Number },
//     },

//     // ── Who created it: vendor themself OR counter officer on their behalf ──
//     createdById: { type: String, default: "" },
//     createdByName: { type: String, default: "" },
//     createdByRole: { type: String, enum: ["vendor", "counter_officer", ""], default: "" },

//     // ── Counter Officer handling ──
//     counterOfficerId: { type: String, default: "" },
//     counterOfficerName: { type: String, default: "" },
//     counterOfficerRemarks: { type: String, default: "" },

//     // ── Survey Officer stage ──
//     survey: surveySchema,

//     // ── A.M.C. (Ward-wise) stage ──
//     amcAction: amcActionSchema,

//     // ── Payment ──
//     payment: paymentSchema,

//     // ── Certificate ──
//     certificate: certificateSchema,

//     // ── Workflow status (backend चा authoritative workflow — frontend च्या dummy "currentStage" पेक्षा जास्त तपशीलवार) ──
//     status: { type: String, enum: APPLICATION_STATUS, default: "Draft" },

//     // ── Renewal tracking ──
//     isRenewal: { type: Boolean, default: false },
//     previousApplicationNo: { type: String, default: "" },

//     statusHistory: [statusHistorySchema],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("VendorApplication", vendorApplicationSchema);




// const mongoose = require("mongoose");
// const { WARDS, APPLICATION_STATUS } = require("../utils/constants");

// // ── Status History (प्रत्येक status change track करण्यासाठी) ──
// const statusHistorySchema = new mongoose.Schema(
//   {
//     status: { type: String, required: true },
//     changedById: { type: String, default: "" },
//     changedByName: { type: String, default: "" },
//     changedByRole: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// // ── Survey Details (Survey Officer भरतो) ──
// const surveySchema = new mongoose.Schema(
//   {
//     geoLocation: { lat: { type: Number }, lng: { type: Number } },
//     surveyPhotos: [{ type: String }],
//     comments: { type: String, default: "" },
//     recommendation: { type: String, enum: ["Approve", "Send Back", ""], default: "" },
//     surveyOfficerId: { type: String, default: "" },
//     surveyOfficerName: { type: String, default: "" },
//     surveyDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── A.M.C. (Ward-wise) Action ──
// const amcActionSchema = new mongoose.Schema(
//   {
//     officerId: { type: String, default: "" },
//     officerName: { type: String, default: "" },
//     ward: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//     decision: { type: String, enum: ["Approved", "Sent Back", "Rejected", ""], default: "" },
//     actionDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── Payment ──
// const paymentSchema = new mongoose.Schema(
//   {
//     amount: { type: Number, default: 0 },
//     status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
//     transactionId: { type: String, default: "" },
//     paidDate: { type: Date },
//     receiptUrl: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Certificate (QR) ──
// const certificateSchema = new mongoose.Schema(
//   {
//     certificateNo: { type: String, default: "" },
//     qrCodeData: { type: String, default: "" },
//     qrCodeUrl: { type: String, default: "" },
//     issueDate: { type: Date },
//     validTill: { type: Date },
//   },
//   { _id: false }
// );

// // ══════════════════════════════════════════════════════════
// //  खालचे 4 sub-schema frontend च्या vendorsSlice.js / vendors.json
// //  शी EXACT जुळतात — personal / address / business / documents
// // ══════════════════════════════════════════════════════════

// // ── Step1Personal.jsx नुसार (field names तसेच ठेवले: aadhaar, pan) ──
// const personalSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     fatherName: { type: String, default: "" },
//     dob: { type: String, default: "" },
//     gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
//     mobile: { type: String, required: true },
//     email: { type: String, default: "" },
//     aadhaar: { type: String, default: "" },
//     pan: { type: String, default: "" },
//     category: { type: String, enum: ["General", "OBC", "SC", "ST", "EWS", ""], default: "" },
//   },
//   { _id: false }
// );

// // ── Step2Address.jsx नुसार ──
// // टीप: हा address.ward frontend dummy मध्ये "Ward 1".."Ward 15" फॉरमॅट आहे (vendor स्वतः निवडतो).
// // खालचा top-level `ward` (Ward A - Ward I) वेगळा आहे — तो officer-assignment साठी operational field आहे.
// //
// // UPDATED (labels changed on the frontend, field keys kept same for backward-compat):
// //   permanentAddress → shown as "RESIDENCE ADDRESS" on the form
// //   currentAddress    → shown as "Working Address" on the form
// // NEW fields added: roadName, serialNo
// const addressSchema = new mongoose.Schema(
//   {
//     permanentAddress: { type: String, default: "" }, // RESIDENCE ADDRESS
//     currentAddress: { type: String, default: "" }, // Working Address
//     roadName: { type: String, default: "" }, // NEW
//     serialNo: { type: String, default: "" }, // NEW
//     ward: { type: String, default: "" },
//     zone: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step3Business.jsx नुसार ──
// // UPDATED: businessCategory → renamed to businessType
// // NEW field added: businessPlace
// // COMMENTED OUT (not collected for now): goodsType, businessTiming, yearsExperience
// const businessSchema = new mongoose.Schema(
//   {
//     vendorType: { type: String, default: "" },
//     businessType: { type: String, default: "" }, // renamed from businessCategory
//     businessPlace: { type: String, default: "" }, // NEW
//     // goodsType: { type: String, default: "" },
//     // businessTiming: { type: String, default: "" },
//     // yearsExperience: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step4Documents.jsx नुसार (named uploads) ──
// const documentsSchema = new mongoose.Schema(
//   {
//     photo: { type: String, default: "" },
//     aadhaarCard: { type: String, default: "" },
//     panCard: { type: String, default: "" },
//     addressProof: { type: String, default: "" },
//     businessProof: { type: String, default: "" },
//   },
//   { _id: false }
// );

// const vendorApplicationSchema = new mongoose.Schema(
//   {
//     applicationNo: { type: String, unique: true, required: true },
//     vendorId: { type: String, default: "" }, // frontend cha short id (उदा. VDR2024001239)

//     // ── frontend शी exact जुळणारे 4 nested groups ──
//     personal: personalSchema,
//     address: addressSchema,
//     business: businessSchema,
//     documents: documentsSchema,

//     // ── Ward (operational — officer-assignment साठी, Ward A - Ward I) ──
//     // counter_officer / survey_officer / A.M.C. यांचं ward-wise routing यावरच चालतं
//     ward: { type: String, enum: [...WARDS, ""], default: "" },
//     vendingLocation: {
//       address: { type: String, default: "" },
//       lat: { type: Number },
//       lng: { type: Number },
//     },

//     // ── Who created it: vendor themself OR counter officer on their behalf ──
//     createdById: { type: String, default: "" },
//     createdByName: { type: String, default: "" },
//     createdByRole: { type: String, enum: ["vendor", "counter_officer", ""], default: "" },

//     // ── Counter Officer handling ──
//     counterOfficerId: { type: String, default: "" },
//     counterOfficerName: { type: String, default: "" },
//     counterOfficerRemarks: { type: String, default: "" },

//     // ── Survey Officer stage ──
//     survey: surveySchema,

//     // ── A.M.C. (Ward-wise) stage ──
//     amcAction: amcActionSchema,

//     // ── Payment ──
//     payment: paymentSchema,

//     // ── Certificate ──
//     certificate: certificateSchema,

//     // ── Workflow status (backend चा authoritative workflow — frontend च्या dummy "currentStage" पेक्षा जास्त तपशीलवार) ──
//     status: { type: String, enum: APPLICATION_STATUS, default: "Draft" },

//     // ── Renewal tracking ──
//     isRenewal: { type: Boolean, default: false },
//     previousApplicationNo: { type: String, default: "" },

//     statusHistory: [statusHistorySchema],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("VendorApplication", vendorApplicationSchema);






// const mongoose = require("mongoose");
// const { WARDS, APPLICATION_STATUS } = require("../utils/constants");

// // ── Status History (प्रत्येक status change track करण्यासाठी) ──
// const statusHistorySchema = new mongoose.Schema(
//   {
//     status: { type: String, required: true },
//     changedById: { type: String, default: "" },
//     changedByName: { type: String, default: "" },
//     changedByRole: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// // ── Survey Details (Survey Officer भरतो) ──
// const surveySchema = new mongoose.Schema(
//   {
//     geoLocation: { lat: { type: Number }, lng: { type: Number } },
//     surveyPhotos: [{ type: String }],
//     comments: { type: String, default: "" },
//     recommendation: { type: String, enum: ["Approve", "Send Back", ""], default: "" },
//     surveyOfficerId: { type: String, default: "" },
//     surveyOfficerName: { type: String, default: "" },
//     surveyDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── A.M.C. (Ward-wise) Action ──
// const amcActionSchema = new mongoose.Schema(
//   {
//     officerId: { type: String, default: "" },
//     officerName: { type: String, default: "" },
//     ward: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//     decision: { type: String, enum: ["Approved", "Sent Back", "Rejected", ""], default: "" },
//     actionDate: { type: Date },
//   },
//   { _id: false }
// );

// // ── Payment ──
// const paymentSchema = new mongoose.Schema(
//   {
//     amount: { type: Number, default: 0 },
//     status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
//     transactionId: { type: String, default: "" },
//     paidDate: { type: Date },
//     receiptUrl: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Certificate (QR) ──
// const certificateSchema = new mongoose.Schema(
//   {
//     certificateNo: { type: String, default: "" },
//     qrCodeData: { type: String, default: "" },
//     qrCodeUrl: { type: String, default: "" },
//     issueDate: { type: Date },
//     validTill: { type: Date },
//   },
//   { _id: false }
// );

// // ══════════════════════════════════════════════════════════
// //  खालचे 4 sub-schema frontend च्या vendorsSlice.js / vendors.json
// //  शी EXACT जुळतात — personal / address / business / documents
// // ══════════════════════════════════════════════════════════

// // ── Step1Personal.jsx नुसार (field names तसेच ठेवले: aadhaar, pan) ──
// const personalSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     fatherName: { type: String, default: "" },
//     dob: { type: String, default: "" },
//     gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
//     mobile: { type: String, required: true },
//     email: { type: String, default: "" },
//     aadhaar: { type: String, default: "" },
//     pan: { type: String, default: "" },
//     category: { type: String, enum: ["General", "OBC", "SC", "ST", "EWS", ""], default: "" },
//   },
//   { _id: false }
// );

// // ── Step2Address.jsx नुसार ──
// // टीप: हा address.ward frontend dummy मध्ये "Ward 1".."Ward 15" फॉरमॅट आहे (vendor स्वतः निवडतो).
// // खालचा top-level `ward` (Ward A - Ward I) वेगळा आहे — तो officer-assignment साठी operational field आहे.
// const addressSchema = new mongoose.Schema(
//   {
//     permanentAddress: { type: String, default: "" },
//     currentAddress: { type: String, default: "" },
//     ward: { type: String, default: "" },
//     zone: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step3Business.jsx नुसार ──
// const businessSchema = new mongoose.Schema(
//   {
//     vendorType: { type: String, default: "" },
//     businessCategory: { type: String, default: "" },
//     goodsType: { type: String, default: "" },
//     businessTiming: { type: String, default: "" },
//     yearsExperience: { type: String, default: "" },
//   },
//   { _id: false }
// );

// // ── Step4Documents.jsx नुसार (named uploads) ──
// const documentsSchema = new mongoose.Schema(
//   {
//     photo: { type: String, default: "" },
//     aadhaarCard: { type: String, default: "" },
//     panCard: { type: String, default: "" },
//     addressProof: { type: String, default: "" },
//     businessProof: { type: String, default: "" },
//   },
//   { _id: false }
// );

// const vendorApplicationSchema = new mongoose.Schema(
//   {
//     applicationNo: { type: String, unique: true, required: true },
//     vendorId: { type: String, default: "" }, // frontend cha short id (उदा. VDR2024001239)

//     // ── frontend शी exact जुळणारे 4 nested groups ──
//     personal: personalSchema,
//     address: addressSchema,
//     business: businessSchema,
//     documents: documentsSchema,

//     // ── Ward (operational — officer-assignment साठी, Ward A - Ward I) ──
//     // counter_officer / survey_officer / A.M.C. यांचं ward-wise routing यावरच चालतं
//     ward: { type: String, enum: [...WARDS, ""], default: "" },
//     vendingLocation: {
//       address: { type: String, default: "" },
//       lat: { type: Number },
//       lng: { type: Number },
//     },

//     // ── Who created it: vendor themself OR counter officer on their behalf ──
//     createdById: { type: String, default: "" },
//     createdByName: { type: String, default: "" },
//     createdByRole: { type: String, enum: ["vendor", "counter_officer", ""], default: "" },

//     // ── Counter Officer handling ──
//     counterOfficerId: { type: String, default: "" },
//     counterOfficerName: { type: String, default: "" },
//     counterOfficerRemarks: { type: String, default: "" },

//     // ── Survey Officer stage ──
//     survey: surveySchema,

//     // ── A.M.C. (Ward-wise) stage ──
//     amcAction: amcActionSchema,

//     // ── Payment ──
//     payment: paymentSchema,

//     // ── Certificate ──
//     certificate: certificateSchema,

//     // ── Workflow status (backend चा authoritative workflow — frontend च्या dummy "currentStage" पेक्षा जास्त तपशीलवार) ──
//     status: { type: String, enum: APPLICATION_STATUS, default: "Draft" },

//     // ── Renewal tracking ──
//     isRenewal: { type: Boolean, default: false },
//     previousApplicationNo: { type: String, default: "" },

//     statusHistory: [statusHistorySchema],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("VendorApplication", vendorApplicationSchema);




const mongoose = require("mongoose");
const { WARDS, APPLICATION_STATUS } = require("../utils/constants");

// ── Status History (प्रत्येक status change track करण्यासाठी) ──
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedById: { type: String, default: "" },
    changedByName: { type: String, default: "" },
    changedByRole: { type: String, default: "" },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

// ── Survey Details (Survey Officer भरतो) ──
const surveySchema = new mongoose.Schema(
  {
    geoLocation: { lat: { type: Number }, lng: { type: Number } },
    surveyPhotos: [{ type: String }],
    comments: { type: String, default: "" },
    recommendation: { type: String, enum: ["Approve", "Send Back", ""], default: "" },
    surveyOfficerId: { type: String, default: "" },
    surveyOfficerName: { type: String, default: "" },
    surveyDate: { type: Date },
  },
  { _id: false }
);

// ── A.M.C. (Ward-wise) Action ──
const amcActionSchema = new mongoose.Schema(
  {
    officerId: { type: String, default: "" },
    officerName: { type: String, default: "" },
    ward: { type: String, default: "" },
    remarks: { type: String, default: "" },
    decision: { type: String, enum: ["Approved", "Sent Back", "Rejected", ""], default: "" },
    actionDate: { type: Date },
  },
  { _id: false }
);

// ── Payment ──
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
    transactionId: { type: String, default: "" },
    paidDate: { type: Date },
    receiptUrl: { type: String, default: "" },
  },
  { _id: false }
);

// ── Certificate (QR) ──
const certificateSchema = new mongoose.Schema(
  {
    certificateNo: { type: String, default: "" },
    qrCodeData: { type: String, default: "" },
    qrCodeUrl: { type: String, default: "" },
    issueDate: { type: Date },
    validTill: { type: Date },
  },
  { _id: false }
);

// ══════════════════════════════════════════════════════════
//  खालचे 4 sub-schema frontend च्या vendorsSlice.js / vendors.json
//  शी EXACT जुळतात — personal / address / business / documents
// ══════════════════════════════════════════════════════════

// ── Step1Personal.jsx नुसार (field names तसेच ठेवले: aadhaar, pan) ──
const personalSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    fatherName: { type: String, default: "" },
    dob: { type: String, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
    mobile: { type: String, required: true },
    email: { type: String, default: "" },
    aadhaar: { type: String, default: "" },
    pan: { type: String, default: "" },
    category: { type: String, enum: ["General", "OBC", "SC", "ST", "EWS", ""], default: "" },
  },
  { _id: false }
);

// ── Step2Address.jsx नुसार ──
// टीप: हा address.ward frontend dummy मध्ये "Ward 1".."Ward 15" फॉरमॅट आहे (vendor स्वतः निवडतो).
// खालचा top-level `ward` (Ward A - Ward I) वेगळा आहे — तो officer-assignment साठी operational field आहे.
//
// UPDATED (labels changed on the frontend, field keys kept same for backward-compat):
//   permanentAddress → shown as "RESIDENCE ADDRESS" on the form
//   currentAddress    → shown as "Working Address" on the form
// NEW fields added: roadName, serialNo
const addressSchema = new mongoose.Schema(
  {
    permanentAddress: { type: String, default: "" }, // RESIDENCE ADDRESS
    currentAddress: { type: String, default: "" }, // Working Address
    roadName: { type: String, default: "" }, // NEW
    serialNo: { type: String, default: "" }, // NEW
    ward: { type: String, default: "" },
    zone: { type: String, default: "" },
  },
  { _id: false }
);

// ── Step3Business.jsx नुसार ──
// UPDATED: businessCategory → renamed to businessType
// NEW field added: businessPlace
// COMMENTED OUT (not collected for now): goodsType, businessTiming, yearsExperience
const businessSchema = new mongoose.Schema(
  {
    vendorType: { type: String, default: "" },
    businessType: { type: String, default: "" }, // renamed from businessCategory
    businessPlace: { type: String, default: "" }, // NEW
    goodsType: { type: String, default: "" }, // RESTORED
    businessTiming: { type: String, default: "" }, // RESTORED — stored as "HH:MM - HH:MM"
    // yearsExperience: { type: String, default: "" },
  },
  { _id: false }
);

// ── Step4Documents.jsx नुसार (named uploads) ──
const documentsSchema = new mongoose.Schema(
  {
    photo: { type: String, default: "" },
    aadhaarCard: { type: String, default: "" },
    panCard: { type: String, default: "" },
    addressProof: { type: String, default: "" },
    businessProof: { type: String, default: "" },
  },
  { _id: false }
);

const vendorApplicationSchema = new mongoose.Schema(
  {
    applicationNo: { type: String, unique: true, required: true },
    vendorId: { type: String, default: "" }, // frontend cha short id (उदा. VDR2024001239)

    // ── frontend शी exact जुळणारे 4 nested groups ──
    personal: personalSchema,
    address: addressSchema,
    business: businessSchema,
    documents: documentsSchema,

    // ── Ward (operational — officer-assignment साठी, Ward A - Ward I) ──
    // counter_officer / survey_officer / A.M.C. यांचं ward-wise routing यावरच चालतं
    ward: { type: String, enum: [...WARDS, ""], default: "" },
    vendingLocation: {
      address: { type: String, default: "" },
      lat: { type: Number },
      lng: { type: Number },
    },

    // ── Who created it: vendor themself OR counter officer on their behalf ──
    createdById: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    createdByRole: { type: String, enum: ["vendor", "counter_officer", ""], default: "" },

    // ── Counter Officer handling ──
    counterOfficerId: { type: String, default: "" },
    counterOfficerName: { type: String, default: "" },
    counterOfficerRemarks: { type: String, default: "" },

    // ── Survey Officer stage ──
    survey: surveySchema,

    // ── A.M.C. (Ward-wise) stage ──
    amcAction: amcActionSchema,

    // ── Payment ──
    payment: paymentSchema,

    // ── Certificate ──
    certificate: certificateSchema,

    // ── Workflow status (backend चा authoritative workflow — frontend च्या dummy "currentStage" पेक्षा जास्त तपशीलवार) ──
    status: { type: String, enum: APPLICATION_STATUS, default: "Draft" },

    // ── Renewal tracking ──
    isRenewal: { type: Boolean, default: false },
    previousApplicationNo: { type: String, default: "" },

    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorApplication", vendorApplicationSchema);