// // const User = require("../models/User");
// // const bcrypt = require("bcryptjs");
// // const generateJwt = require("../utils/generateJwt");
// // const sendWhatsAppOtp = require("../utils/sendWhatsAppOtp");
// // const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// // // ══════════════════════════════════════════════
// // //  OTP LOGIN (Vendor / Citizen — mobile number आधारित)
// // // ══════════════════════════════════════════════

// // // ✅ SEND OTP — OTP generate करा + WhatsApp वर पाठवा
// // exports.sendOtp = async (req, res) => {
// //   try {
// //     const { mobileNo } = req.body;

// //     if (!mobileNo || !/^\d{10}$/.test(mobileNo.trim())) {
// //       return res.status(400).json({ success: false, message: "Valid 10 digit mobile number required ❌" });
// //     }

// //     const mobile = mobileNo.trim();
// //     const otp = Math.floor(100000 + Math.random() * 900000).toString();

// //     setOtp(mobile, otp);
// //     await sendWhatsAppOtp(mobile, otp);

// //     return res.status(200).json({ success: true, message: "OTP पाठवला ✅" });
// //   } catch (error) {
// //     console.log("SendOTP Error:", error);
// //     return res.status(500).json({ success: false, message: "OTP पाठवण्यात error ❌" });
// //   }
// // };

// // // ✅ VERIFY OTP + LOGIN — जर mobile आधीच registered असेल तर login, नाहीतर नवीन vendor account create करा
// // exports.verifyOtpLogin = async (req, res) => {
// //   try {
// //     const { mobileNo, otp, fullName } = req.body;

// //     if (!mobileNo || !otp) {
// //       return res.status(400).json({ success: false, message: "Mobile number आणि OTP आवश्यक ❌" });
// //     }

// //     const mobile = mobileNo.trim();
// //     const result = checkOtp(mobile, otp);
// //     if (!result.valid) {
// //       return res.status(400).json({ success: false, message: result.reason });
// //     }

// //     let user = await User.findOne({ mobileNumber: mobile });

// //     // पहिल्यांदाच login करत असेल तर auto-register (role = vendor by default)
// //     if (!user) {
// //       user = await User.create({
// //         fullName: fullName || "Vendor",
// //         userName: mobile,
// //         mobileNumber: mobile,
// //         role: "vendor",
// //       });
// //     }

// //     const token = generateJwt(user);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Login Success ✅",
// //       token,
// //       user: {
// //         id: user._id,
// //         fullName: user.fullName,
// //         mobileNumber: user.mobileNumber,
// //         role: user.role,
// //         ward: user.ward,
// //       },
// //     });
// //   } catch (error) {
// //     console.log("VerifyOtpLogin Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ✅ CHECK MOBILE — registered आहे का
// // exports.checkMobile = async (req, res) => {
// //   try {
// //     const { mobileNo } = req.body;
// //     if (!mobileNo) return res.status(400).json({ success: false, message: "Mobile number required ❌" });

// //     const trimmed = mobileNo.toString().trim();
// //     if (!/^\d{10}$/.test(trimmed)) {
// //       return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
// //     }

// //     const user = await User.findOne({ mobileNumber: trimmed });
// //     return res.status(200).json({
// //       success: true,
// //       exists: !!user,
// //       message: user ? "Mobile number registered आहे ✅" : "Mobile number registered नाही ❌",
// //     });
// //   } catch (error) {
// //     console.log("CheckMobile Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ══════════════════════════════════════════════
// // //  STAFF LOGIN (Counter Officer / Survey Officer / Concern Officer / Super Admin)
// // // ══════════════════════════════════════════════

// // // ✅ REGISTER STAFF USER (by Super Admin)
// // exports.registerUser = async (req, res) => {
// //   try {
// //     let { fullName, userName, mobileNumber, email, password, role, ward, departmentName, office } = req.body;

// //     fullName = fullName?.trim();
// //     userName = userName?.trim().toLowerCase();
// //     mobileNumber = mobileNumber?.trim();
// //     email = email?.trim().toLowerCase();

// //     if (!fullName || !userName || !mobileNumber || !password || !role) {
// //       return res.status(400).json({ success: false, message: "All fields required ❌" });
// //     }

// //     if (!/^\d{10}$/.test(mobileNumber)) {
// //       return res.status(400).json({ success: false, message: "Invalid mobile number ❌ (10 digits required)" });
// //     }

// //     // counter_officer, survey_officer, concern_officer यांना ward compulsory
// //     if (["counter_officer", "survey_officer", "A.M.C."].includes(role) && !ward) {
// //       return res.status(400).json({ success: false, message: "Ward required for this role ❌" });
// //     }

// //     const existingUserName = await User.findOne({ userName });
// //     if (existingUserName) {
// //       return res.status(409).json({ success: false, message: "Username already exists ❌" });
// //     }

// //     const existingMobile = await User.findOne({ mobileNumber });
// //     if (existingMobile) {
// //       return res.status(409).json({ success: false, message: "Mobile number already registered ❌" });
// //     }

// //     const hashedPassword = await bcrypt.hash(password, 10);

// //     // counter_officer आणि concern_officer यांना edit access default true
// //     const editAccess = ["counter_officer", "A.M.C.", "super_admin"].includes(role);

// //     const newUser = await User.create({
// //       fullName,
// //       userName,
// //       mobileNumber,
// //       email,
// //       password: hashedPassword,
// //       role,
// //       ward: ward || "",
// //       editAccess,
// //       departmentName,
// //       office,
// //     });

// //     return res.status(201).json({
// //       success: true,
// //       message: "User Registered Successfully ✅",
// //       user: {
// //         id: newUser._id,
// //         fullName: newUser.fullName,
// //         userName: newUser.userName,
// //         role: newUser.role,
// //         ward: newUser.ward,
// //         editAccess: newUser.editAccess,
// //       },
// //     });
// //   } catch (error) {
// //     console.log("Register Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ✅ LOGIN (username + password) — staff roles साठी
// // exports.loginUser = async (req, res) => {
// //   try {
// //     const { userName, password } = req.body;
// //     if (!userName || !password) {
// //       return res.status(400).json({ success: false, message: "Username आणि Password required आहे ❌" });
// //     }

// //     const user = await User.findOne({ userName: userName.trim().toLowerCase() });
// //     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

// //     const isMatch = await bcrypt.compare(password, user.password || "");
// //     if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password ❌" });

// //     const token = generateJwt(user);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Login Success ✅",
// //       token,
// //       user: {
// //         id: user._id,
// //         fullName: user.fullName,
// //         userName: user.userName,
// //         role: user.role,
// //         ward: user.ward,
// //         editAccess: user.editAccess,
// //         departmentName: user.departmentName,
// //         office: user.office,
// //       },
// //     });
// //   } catch (error) {
// //     console.log("Login Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ✅ UPDATE USER
// // exports.updateUser = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const updatePayload = req.body;

// //     if (!updatePayload || Object.keys(updatePayload).length === 0) {
// //       return res.status(400).json({ success: false, message: "Update data required ❌" });
// //     }

// //     if (updatePayload.password) {
// //       updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
// //     }

// //     if (updatePayload.mobileNumber && !/^\d{10}$/.test(updatePayload.mobileNumber)) {
// //       return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
// //     }

// //     const user = await User.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).select("-password");
// //     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

// //     return res.status(200).json({ success: true, message: "User Updated Successfully ✅", user });
// //   } catch (error) {
// //     console.log("Update Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ✅ GET ALL USERS (filter by role / ward — Super Admin साठी)
// // exports.getUsers = async (req, res) => {
// //   try {
// //     const { role, ward } = req.query;
// //     const filter = {};
// //     if (role) filter.role = role;
// //     if (ward) filter.ward = ward;

// //     const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
// //     return res.status(200).json({ success: true, count: users.length, users });
// //   } catch (error) {
// //     console.log("Get Users Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // // ✅ DELETE USER
// // exports.deleteUser = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const user = await User.findByIdAndDelete(id);
// //     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

// //     return res.status(200).json({ success: true, message: "User Deleted Successfully ✅" });
// //   } catch (error) {
// //     console.log("Delete Error:", error);
// //     return res.status(500).json({ success: false, message: "Server Error ❌" });
// //   }
// // };

// // ========================================


// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const generateJwt = require("../utils/generateJwt");
// const sendWhatsAppOtp = require("../utils/sendWhatsAppOtp");
// const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// // ══════════════════════════════════════════════
// //  OTP LOGIN (Vendor / Citizen — mobile number आधारित)
// // ══════════════════════════════════════════════

// // ✅ SEND OTP — OTP generate करा + WhatsApp वर पाठवा
// exports.sendOtp = async (req, res) => {
//   try {
//     const { mobileNo } = req.body;

//     if (!mobileNo || !/^\d{10}$/.test(mobileNo.trim())) {
//       return res.status(400).json({ success: false, message: "Valid 10 digit mobile number required ❌" });
//     }

//     const mobile = mobileNo.trim();
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     setOtp(mobile, otp);
//     await sendWhatsAppOtp(mobile, otp);

//     return res.status(200).json({ success: true, message: "OTP पाठवला ✅" });
//   } catch (error) {
//     console.log("SendOTP Error:", error);
//     return res.status(500).json({ success: false, message: "OTP पाठवण्यात error ❌" });
//   }
// };

// // ✅ VERIFY OTP + LOGIN — जर mobile आधीच registered असेल तर login, नाहीतर नवीन vendor account create करा
// exports.verifyOtpLogin = async (req, res) => {
//   try {
//     const { mobileNo, otp, fullName } = req.body;

//     if (!mobileNo || !otp) {
//       return res.status(400).json({ success: false, message: "Mobile number आणि OTP आवश्यक ❌" });
//     }

//     const mobile = mobileNo.trim();
//     const result = checkOtp(mobile, otp);
//     if (!result.valid) {
//       return res.status(400).json({ success: false, message: result.reason });
//     }

//     let user = await User.findOne({ mobileNumber: mobile });

//     // पहिल्यांदाच login करत असेल तर auto-register (role = vendor by default)
//     if (!user) {
//       user = await User.create({
//         fullName: fullName || "Vendor",
//         userName: mobile,
//         mobileNumber: mobile,
//         role: "vendor",
//       });
//     }

//     const token = generateJwt(user);

//     return res.status(200).json({
//       success: true,
//       message: "Login Success ✅",
//       token,
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         mobileNumber: user.mobileNumber,
//         role: user.role,
//         ward: user.ward,
//       },
//     });
//   } catch (error) {
//     console.log("VerifyOtpLogin Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ✅ CHECK MOBILE — registered आहे का
// exports.checkMobile = async (req, res) => {
//   try {
//     const { mobileNo } = req.body;
//     if (!mobileNo) return res.status(400).json({ success: false, message: "Mobile number required ❌" });

//     const trimmed = mobileNo.toString().trim();
//     if (!/^\d{10}$/.test(trimmed)) {
//       return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
//     }

//     const user = await User.findOne({ mobileNumber: trimmed });
//     return res.status(200).json({
//       success: true,
//       exists: !!user,
//       message: user ? "Mobile number registered आहे ✅" : "Mobile number registered नाही ❌",
//     });
//   } catch (error) {
//     console.log("CheckMobile Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ══════════════════════════════════════════════
// //  STAFF LOGIN (Counter Officer / Survey Officer / A.M.C. / Super Admin)
// // ══════════════════════════════════════════════

// // ✅ REGISTER STAFF USER (by Super Admin)
// exports.registerUser = async (req, res) => {
//   try {
//     let { fullName, userName, mobileNumber, email, password, role, ward, departmentName, office } = req.body;

//     fullName = fullName?.trim();
//     userName = userName?.trim().toLowerCase();
//     mobileNumber = mobileNumber?.trim();
//     email = email?.trim().toLowerCase();

//     if (!fullName || !userName || !mobileNumber || !password || !role) {
//       return res.status(400).json({ success: false, message: "All fields required ❌" });
//     }

//     if (!/^\d{10}$/.test(mobileNumber)) {
//       return res.status(400).json({ success: false, message: "Invalid mobile number ❌ (10 digits required)" });
//     }

//     // counter_officer, survey_officer, A.M.C. यांना ward compulsory
//     if (["counter_officer", "survey_officer", "A.M.C."].includes(role) && !ward) {
//       return res.status(400).json({ success: false, message: "Ward required for this role ❌" });
//     }

//     const existingUserName = await User.findOne({ userName });
//     if (existingUserName) {
//       return res.status(409).json({ success: false, message: "Username already exists ❌" });
//     }

//     const existingMobile = await User.findOne({ mobileNumber });
//     if (existingMobile) {
//       return res.status(409).json({ success: false, message: "Mobile number already registered ❌" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     // counter_officer आणि A.M.C. यांना edit access default true
//     const editAccess = ["counter_officer", "A.M.C.", "super_admin"].includes(role);

//     const newUser = await User.create({
//       fullName,
//       userName,
//       mobileNumber,
//       email,
//       password: hashedPassword,
//       role,
//       ward: ward || "",
//       editAccess,
//       departmentName,
//       office,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "User Registered Successfully ✅",
//       user: {
//         id: newUser._id,
//         fullName: newUser.fullName,
//         userName: newUser.userName,
//         role: newUser.role,
//         ward: newUser.ward,
//         editAccess: newUser.editAccess,
//       },
//     });
//   } catch (error) {
//     console.log("Register Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ✅ LOGIN (username + password) — staff roles साठी
// exports.loginUser = async (req, res) => {
//   try {
//     const { userName, password } = req.body;
//     if (!userName || !password) {
//       return res.status(400).json({ success: false, message: "Username आणि Password required आहे ❌" });
//     }

//     const user = await User.findOne({ userName: userName.trim().toLowerCase() });
//     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

//     const isMatch = await bcrypt.compare(password, user.password || "");
//     if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password ❌" });

//     const token = generateJwt(user);

//     return res.status(200).json({
//       success: true,
//       message: "Login Success ✅",
//       token,
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         userName: user.userName,
//         role: user.role,
//         ward: user.ward,
//         editAccess: user.editAccess,
//         departmentName: user.departmentName,
//         office: user.office,
//       },
//     });
//   } catch (error) {
//     console.log("Login Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ✅ UPDATE USER
// exports.updateUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updatePayload = req.body;

//     if (!updatePayload || Object.keys(updatePayload).length === 0) {
//       return res.status(400).json({ success: false, message: "Update data required ❌" });
//     }

//     if (updatePayload.password) {
//       updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
//     }

//     if (updatePayload.mobileNumber && !/^\d{10}$/.test(updatePayload.mobileNumber)) {
//       return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
//     }

//     const user = await User.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).select("-password");
//     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

//     return res.status(200).json({ success: true, message: "User Updated Successfully ✅", user });
//   } catch (error) {
//     console.log("Update Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ✅ GET ALL USERS (filter by role / ward — Super Admin साठी)
// exports.getUsers = async (req, res) => {
//   try {
//     const { role, ward } = req.query;
//     const filter = {};
//     if (role) filter.role = role;
//     if (ward) filter.ward = ward;

//     const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
//     return res.status(200).json({ success: true, count: users.length, users });
//   } catch (error) {
//     console.log("Get Users Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };

// // ✅ DELETE USER
// exports.deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findByIdAndDelete(id);
//     if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

//     return res.status(200).json({ success: true, message: "User Deleted Successfully ✅" });
//   } catch (error) {
//     console.log("Delete Error:", error);
//     return res.status(500).json({ success: false, message: "Server Error ❌" });
//   }
// };



const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateJwt = require("../utils/generateJwt");
const sendWhatsAppOtp = require("../utils/sendWhatsAppOtp");
const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// ══════════════════════════════════════════════
//  OTP LOGIN (Vendor / Citizen — mobile number based)
// ══════════════════════════════════════════════

// ✅ SEND OTP — generate OTP and send via WhatsApp
exports.sendOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (!mobileNo || !/^\d{10}$/.test(mobileNo.trim())) {
      return res.status(400).json({ success: false, message: "Valid 10 digit mobile number required ❌" });
    }

    const mobile = mobileNo.trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    setOtp(mobile, otp);
    await sendWhatsAppOtp(mobile, otp);

    return res.status(200).json({ success: true, message: "OTP sent ✅" });
  } catch (error) {
    console.log("SendOTP Error:", error);
    return res.status(500).json({ success: false, message: "Error sending OTP ❌" });
  }
};

// ✅ VERIFY OTP + LOGIN — if mobile is already registered then login, otherwise create a new vendor account
exports.verifyOtpLogin = async (req, res) => {
  try {
    const { mobileNo, otp, fullName } = req.body;

    if (!mobileNo || !otp) {
      return res.status(400).json({ success: false, message: "Mobile number and OTP are required ❌" });
    }

    const mobile = mobileNo.trim();
    const result = checkOtp(mobile, otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    let user = await User.findOne({ mobileNumber: mobile });

    // First-time login — auto-register (role = vendor by default)
    if (!user) {
      user = await User.create({
        fullName: fullName || "Vendor",
        userName: mobile,
        mobileNumber: mobile,
        role: "vendor",
      });
    }

    const token = generateJwt(user);

    return res.status(200).json({
      success: true,
      message: "Login Success ✅",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        role: user.role,
        ward: user.ward,
      },
    });
  } catch (error) {
    console.log("VerifyOtpLogin Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ✅ CHECK MOBILE — check whether the number is already registered
exports.checkMobile = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo) return res.status(400).json({ success: false, message: "Mobile number required ❌" });

    const trimmed = mobileNo.toString().trim();
    if (!/^\d{10}$/.test(trimmed)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
    }

    const user = await User.findOne({ mobileNumber: trimmed });
    return res.status(200).json({
      success: true,
      exists: !!user,
      message: user ? "Mobile number is registered ✅" : "Mobile number is not registered ❌",
    });
  } catch (error) {
    console.log("CheckMobile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ══════════════════════════════════════════════
//  STAFF LOGIN (Counter Officer / Survey Officer / A.M.C. / Super Admin)
// ══════════════════════════════════════════════

// ✅ REGISTER STAFF USER (by Super Admin)
exports.registerUser = async (req, res) => {
  try {
    let { fullName, userName, mobileNumber, email, password, role, ward, departmentName, office } = req.body;

    fullName = fullName?.trim();
    userName = userName?.trim().toLowerCase();
    mobileNumber = mobileNumber?.trim();
    email = email?.trim().toLowerCase();

    if (!fullName || !userName || !mobileNumber || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields required ❌" });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number ❌ (10 digits required)" });
    }

    // ward is compulsory for counter_officer, survey_officer, A.M.C.
    if (["counter_officer", "survey_officer", "A.M.C."].includes(role) && !ward) {
      return res.status(400).json({ success: false, message: "Ward required for this role ❌" });
    }

    const existingUserName = await User.findOne({ userName });
    if (existingUserName) {
      return res.status(409).json({ success: false, message: "Username already exists ❌" });
    }

    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(409).json({ success: false, message: "Mobile number already registered ❌" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // counter_officer and A.M.C. get edit access by default
    const editAccess = ["counter_officer", "A.M.C.", "super_admin"].includes(role);

    const newUser = await User.create({
      fullName,
      userName,
      mobileNumber,
      email,
      password: hashedPassword,
      role,
      ward: ward || "",
      editAccess,
      departmentName,
      office,
    });

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully ✅",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        userName: newUser.userName,
        role: newUser.role,
        ward: newUser.ward,
        editAccess: newUser.editAccess,
      },
    });
  } catch (error) {
    console.log("Register Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ✅ LOGIN (username + password) — for staff roles
exports.loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res.status(400).json({ success: false, message: "Username and Password are required ❌" });
    }

    const user = await User.findOne({ userName: userName.trim().toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password ❌" });

    const token = generateJwt(user);

    return res.status(200).json({
      success: true,
      message: "Login Success ✅",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        role: user.role,
        ward: user.ward,
        editAccess: user.editAccess,
        departmentName: user.departmentName,
        office: user.office,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ✅ UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;

    if (!updatePayload || Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: "Update data required ❌" });
    }

    if (updatePayload.password) {
      updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
    }

    if (updatePayload.mobileNumber && !/^\d{10}$/.test(updatePayload.mobileNumber)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number ❌" });
    }

    const user = await User.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

    return res.status(200).json({ success: true, message: "User Updated Successfully ✅", user });
  } catch (error) {
    console.log("Update Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ✅ GET ALL USERS (filter by role / ward — for Super Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, ward } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (ward) filter.ward = ward;

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.log("Get Users Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

// ✅ DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: "User Not Found ❌" });

    return res.status(200).json({ success: true, message: "User Deleted Successfully ✅" });
  } catch (error) {
    console.log("Delete Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};