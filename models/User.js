const mongoose = require("mongoose");
const { ROLES, WARDS } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },

    userName: {
      type: String,
      trim: true,
      lowercase: true,
    },

    mobileNumber: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    // vendor / citizen / A.M.C. / survey_officer / concern_officer / super_admin
    role: {
      type: String,
      enum: ROLES,
      default: "vendor",
    },

    // counter_officer, survey_officer, concern_officer यांच्यासाठी ward compulsory
    // (Ward A - Ward I) — a.m.c./officer फक्त त्यांच्या ward च्या applications बघू शकतो
    ward: {
      type: String,
      enum: [...WARDS, ""],
      default: "",
    },

    // counter_officer आणि concern_officer यांना edit access असतो (workflow नुसार)
    editAccess: {
      type: Boolean,
      default: false,
    },

    departmentName: {
      type: String,
      default: "",
    },

    office: {
      type: String,
      default: "VVCMC",
    },

    departmentCategory: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
