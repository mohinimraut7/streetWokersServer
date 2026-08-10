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

//     // ── कोणाकडे assign केली — counter officer / concern officer ──
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



const mongoose = require("mongoose");
const { WARDS, GRIEVANCE_STATUS, GRIEVANCE_TYPE } = require("../utils/constants");

// ── Reply Schema (जसे InwardApplication मध्ये आहे) ──
const replySchema = new mongoose.Schema(
  {
    replyMessage: { type: String },
    repliedBy: { type: String, default: "" },
    repliedByName: { type: String, default: "" },
    repliedByRole: { type: String, default: "" },
    status: { type: String, default: "" },
  },
  { timestamps: true }
);

const grievanceSchema = new mongoose.Schema(
  {
    grievanceNo: {
      type: String,
      unique: true,
      required: true,
    },

    // ── कोणी complaint केली — vendor की citizen ──
    complainantType: {
      type: String,
      enum: GRIEVANCE_TYPE,
      required: true,
    },

    complainantId: { type: String, default: "" },
    complainantName: { type: String, required: true },
    complainantMobile: { type: String, required: true },

    // vendor असेल तर त्यांच्या application शी link (optional)
    relatedApplicationNo: { type: String, default: "" },

    ward: {
      type: String,
      enum: [...WARDS, ""],
      default: "",
    },

    subject: { type: String, required: true },
    description: { type: String, required: true },

    documents: [{ type: String }], // Cloudinary URLs

    // ── कोणाकडे assign केली — counter officer / A.M.C. ──
    assignedToId: { type: String, default: "" },
    assignedToName: { type: String, default: "" },
    assignedToRole: { type: String, default: "" },

    status: {
      type: String,
      enum: GRIEVANCE_STATUS,
      default: "Pending",
    },

    replies: [replySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", grievanceSchema);