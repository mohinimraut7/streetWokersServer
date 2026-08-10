// // const Grievance = require("../models/Grievance");
// // const { generateGrievanceNo } = require("../utils/generateNumbers");
// // const { checkWardAccess } = require("../utils/wardAccess");

// // // ═══════════════════════════════════════════════════════
// // //  1) FILE GRIEVANCE — Vendor किंवा Citizen कोणीही complain टाकू शकतो
// // // ═══════════════════════════════════════════════════════
// // exports.createGrievance = async (req, res) => {
// //   try {
// //     const {
// //       complainantType,        // "vendor" | "citizen"
// //       complainantName, complainantMobile,
// //       relatedApplicationNo, ward,
// //       subject, description,
// //     } = req.body;

// //     if (!complainantType || !complainantName || !complainantMobile || !subject || !description) {
// //       return res.status(400).json({ success: false, message: "All fields required ❌" });
// //     }

// //     const documentPaths = (req.files || []).map((f) => f.path);
// //     const grievanceNo = await generateGrievanceNo();

// //     const newGrievance = new Grievance({
// //       grievanceNo,
// //       complainantType,
// //       complainantId: req.user?.id || "",
// //       complainantName,
// //       complainantMobile,
// //       relatedApplicationNo: relatedApplicationNo || "",
// //       ward: ward || "",
// //       subject,
// //       description,
// //       documents: documentPaths,
// //       status: "Pending",
// //     });

// //     await newGrievance.save();

// //     return res.status(201).json({
// //       success: true,
// //       message: "Grievance Filed Successfully ✅",
// //       grievanceNo,
// //       data: newGrievance,
// //     });
// //   } catch (error) {
// //     console.error("Create Grievance Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  2) GET ALL GRIEVANCES — role/ward नुसार filter, pagination
// // // ═══════════════════════════════════════════════════════
// // exports.getAllGrievances = async (req, res) => {
// //   try {
// //     const { status, complainantType, page = 1, limit = 20 } = req.query;
// //     const pageNum = parseInt(page);
// //     const limitNum = parseInt(limit);
// //     const skip = (pageNum - 1) * limitNum;

// //     // ── role/ward/userId नेहमी JWT (req.user) वरून, client query वरून कधीच नाही ──
// //     const { role, ward, id: userId } = req.user;

// //     const filter = {};

// //     if (role === "vendor" || role === "citizen") {
// //       filter.complainantId = userId; // स्वतःच्याच complaints दिसतात
// //     } else if (["counter_officer", "concern_officer"].includes(role)) {
// //       // Counter Officer आणि Concern Officer ward-wise — फक्त स्वतःच्या ward च्या grievances
// //       if (!ward) {
// //         return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
// //       }
// //       filter.ward = ward;
// //     }
// //     // super_admin → सर्व grievances दिसतात

// //     if (status) filter.status = status;
// //     if (complainantType) filter.complainantType = complainantType;

// //     const total = await Grievance.countDocuments(filter);
// //     const grievances = await Grievance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Grievances Fetched Successfully ✅",
// //       data: grievances,
// //       total,
// //       page: pageNum,
// //       totalPages: Math.ceil(total / limitNum),
// //     });
// //   } catch (error) {
// //     console.error("Get All Grievances Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  3) GET GRIEVANCE BY NUMBER
// // // ═══════════════════════════════════════════════════════
// // exports.getGrievanceByNo = async (req, res) => {
// //   try {
// //     const { grievanceNo } = req.params;
// //     const grievance = await Grievance.findOne({ grievanceNo });
// //     if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

// //     return res.status(200).json({ success: true, data: grievance });
// //   } catch (error) {
// //     console.error("Get Grievance Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  4) ASSIGN GRIEVANCE — counter officer / concern officer कडे assign करा
// // // ═══════════════════════════════════════════════════════
// // exports.assignGrievance = async (req, res) => {
// //   try {
// //     const { grievanceNo } = req.params;
// //     const { assignedToId, assignedToName, assignedToRole } = req.body;

// //     const grievance = await Grievance.findOne({ grievanceNo });
// //     if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

// //     const wardCheck = checkWardAccess(req.user, grievance.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     grievance.assignedToId = assignedToId || "";
// //     grievance.assignedToName = assignedToName || "";
// //     grievance.assignedToRole = assignedToRole || "";
// //     grievance.status = "In Progress";
// //     await grievance.save();

// //     return res.status(200).json({ success: true, message: "Grievance Assigned ✅", data: grievance });
// //   } catch (error) {
// //     console.error("Assign Grievance Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };

// // // ═══════════════════════════════════════════════════════
// // //  5) REPLY TO GRIEVANCE — officer response देतो, status update होतो
// // // ═══════════════════════════════════════════════════════
// // exports.replyGrievance = async (req, res) => {
// //   try {
// //     const { grievanceNo } = req.params;
// //     const { replyMessage, status, repliedBy, repliedByName, repliedByRole } = req.body;

// //     if (!replyMessage || !replyMessage.trim()) {
// //       return res.status(400).json({ success: false, message: "replyMessage is required ❌" });
// //     }

// //     const grievance = await Grievance.findOne({ grievanceNo });
// //     if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

// //     const wardCheck = checkWardAccess(req.user, grievance.ward);
// //     if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

// //     grievance.replies.push({
// //       replyMessage: replyMessage.trim(),
// //       repliedBy: repliedBy || req.user?.id || "",
// //       repliedByName: repliedByName || req.user?.userName || "",
// //       repliedByRole: repliedByRole || req.user?.role || "",
// //       status: status || grievance.status,
// //     });

// //     if (status) grievance.status = status;
// //     await grievance.save();

// //     return res.status(200).json({
// //       success: true,
// //       message: "Reply Added Successfully ✅",
// //       data: grievance,
// //     });
// //   } catch (error) {
// //     console.error("Reply Grievance Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
// //   }
// // };


// const mongoose = require("mongoose");
// const { WARDS, GRIEVANCE_STATUS, GRIEVANCE_TYPE } = require("../utils/constants");

// // ── Reply Schema (जसे InwardApplication मध्ये आहे) ──
// const replySchema = new mongoose.Schema(
//   {
//     replyMessage: { type: String },
//     repliedBy: { type: String, default: "" },
//     repliedByName: { type: String, default: "" },
//     repliedByRole: { type: String, default: "" },
//     status: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// const grievanceSchema = new mongoose.Schema(
//   {
//     grievanceNo: {
//       type: String,
//       unique: true,
//       required: true,
//     },

//     // ── कोणी complaint केली — vendor की citizen ──
//     complainantType: {
//       type: String,
//       enum: GRIEVANCE_TYPE,
//       required: true,
//     },

//     complainantId: { type: String, default: "" },
//     complainantName: { type: String, required: true },
//     complainantMobile: { type: String, required: true },

//     // vendor असेल तर त्यांच्या application शी link (optional)
//     relatedApplicationNo: { type: String, default: "" },

//     ward: {
//       type: String,
//       enum: [...WARDS, ""],
//       default: "",
//     },

//     subject: { type: String, required: true },
//     description: { type: String, required: true },

//     documents: [{ type: String }], // Cloudinary URLs

//     // ── कोणाकडे assign केली — counter officer / A.M.C. ──
//     assignedToId: { type: String, default: "" },
//     assignedToName: { type: String, default: "" },
//     assignedToRole: { type: String, default: "" },

//     status: {
//       type: String,
//       enum: GRIEVANCE_STATUS,
//       default: "Pending",
//     },

//     replies: [replySchema],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Grievance", grievanceSchema);




const Grievance = require("../models/Grievance");
const { generateGrievanceNo } = require("../utils/generateNumbers");
const { checkWardAccess } = require("../utils/wardAccess");

// ═══════════════════════════════════════════════════════
//  1) FILE GRIEVANCE — Vendor किंवा Citizen कोणीही complain टाकू शकतो
// ═══════════════════════════════════════════════════════
exports.createGrievance = async (req, res) => {
  try {
    const {
      complainantType,        // "vendor" | "citizen"
      complainantName, complainantMobile,
      relatedApplicationNo, ward,
      subject, description,
    } = req.body;

    if (!complainantType || !complainantName || !complainantMobile || !subject || !description) {
      return res.status(400).json({ success: false, message: "All fields required ❌" });
    }

    const documentPaths = (req.files || []).map((f) => f.path);
    const grievanceNo = await generateGrievanceNo();

    const newGrievance = new Grievance({
      grievanceNo,
      complainantType,
      complainantId: req.user?.id || "",
      complainantName,
      complainantMobile,
      relatedApplicationNo: relatedApplicationNo || "",
      ward: ward || "",
      subject,
      description,
      documents: documentPaths,
      status: "Pending",
    });

    await newGrievance.save();

    return res.status(201).json({
      success: true,
      message: "Grievance Filed Successfully ✅",
      grievanceNo,
      data: newGrievance,
    });
  } catch (error) {
    console.error("Create Grievance Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  2) GET ALL GRIEVANCES — role/ward नुसार filter, pagination
// ═══════════════════════════════════════════════════════
exports.getAllGrievances = async (req, res) => {
  try {
    const { status, complainantType, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ── role/ward/userId नेहमी JWT (req.user) वरून, client query वरून कधीच नाही ──
    const { role, ward, id: userId } = req.user;

    const filter = {};

    if (role === "vendor" || role === "citizen") {
      filter.complainantId = userId; // स्वतःच्याच complaints दिसतात
    } else if (["counter_officer", "A.M.C."].includes(role)) {
      // Counter Officer आणि A.M.C. ward-wise — फक्त स्वतःच्या ward च्या grievances
      if (!ward) {
        return res.status(403).json({ success: false, message: "तुमच्या account ला ward assign नाही ❌" });
      }
      filter.ward = ward;
    }
    // super_admin → सर्व grievances दिसतात

    if (status) filter.status = status;
    if (complainantType) filter.complainantType = complainantType;

    const total = await Grievance.countDocuments(filter);
    const grievances = await Grievance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum);

    return res.status(200).json({
      success: true,
      message: "Grievances Fetched Successfully ✅",
      data: grievances,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get All Grievances Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  3) GET GRIEVANCE BY NUMBER
// ═══════════════════════════════════════════════════════
exports.getGrievanceByNo = async (req, res) => {
  try {
    const { grievanceNo } = req.params;
    const grievance = await Grievance.findOne({ grievanceNo });
    if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

    return res.status(200).json({ success: true, data: grievance });
  } catch (error) {
    console.error("Get Grievance Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  4) ASSIGN GRIEVANCE — counter officer / A.M.C. कडे assign करा
// ═══════════════════════════════════════════════════════
exports.assignGrievance = async (req, res) => {
  try {
    const { grievanceNo } = req.params;
    const { assignedToId, assignedToName, assignedToRole } = req.body;

    const grievance = await Grievance.findOne({ grievanceNo });
    if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

    const wardCheck = checkWardAccess(req.user, grievance.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    grievance.assignedToId = assignedToId || "";
    grievance.assignedToName = assignedToName || "";
    grievance.assignedToRole = assignedToRole || "";
    grievance.status = "In Progress";
    await grievance.save();

    return res.status(200).json({ success: true, message: "Grievance Assigned ✅", data: grievance });
  } catch (error) {
    console.error("Assign Grievance Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
//  5) REPLY TO GRIEVANCE — officer response देतो, status update होतो
// ═══════════════════════════════════════════════════════
exports.replyGrievance = async (req, res) => {
  try {
    const { grievanceNo } = req.params;
    const { replyMessage, status, repliedBy, repliedByName, repliedByRole } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({ success: false, message: "replyMessage is required ❌" });
    }

    const grievance = await Grievance.findOne({ grievanceNo });
    if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found ❌" });

    const wardCheck = checkWardAccess(req.user, grievance.ward);
    if (!wardCheck.ok) return res.status(403).json({ success: false, message: wardCheck.message });

    grievance.replies.push({
      replyMessage: replyMessage.trim(),
      repliedBy: repliedBy || req.user?.id || "",
      repliedByName: repliedByName || req.user?.userName || "",
      repliedByRole: repliedByRole || req.user?.role || "",
      status: status || grievance.status,
    });

    if (status) grievance.status = status;
    await grievance.save();

    return res.status(200).json({
      success: true,
      message: "Reply Added Successfully ✅",
      data: grievance,
    });
  } catch (error) {
    console.error("Reply Grievance Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌", error: error.message });
  }
};
