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



// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const generateJwt = require("../utils/generateJwt");
// const sendWhatsAppOtp = require("../utils/sendWhatsAppOtp");
// const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// // ══════════════════════════════════════════════
// //  OTP LOGIN (Vendor / Citizen — mobile number based)
// // ══════════════════════════════════════════════

// // ✅ SEND OTP — generate OTP and send via WhatsApp
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

//     return res.status(200).json({ success: true, message: "OTP sent ✅" });
//   } catch (error) {
//     console.log("SendOTP Error:", error);
//     return res.status(500).json({ success: false, message: "Error sending OTP ❌" });
//   }
// };

// // ✅ VERIFY OTP + LOGIN — if mobile is already registered then login, otherwise create a new vendor account
// exports.verifyOtpLogin = async (req, res) => {
//   try {
//     const { mobileNo, otp, fullName } = req.body;

//     if (!mobileNo || !otp) {
//       return res.status(400).json({ success: false, message: "Mobile number and OTP are required ❌" });
//     }

//     const mobile = mobileNo.trim();
//     const result = checkOtp(mobile, otp);
//     if (!result.valid) {
//       return res.status(400).json({ success: false, message: result.reason });
//     }

//     let user = await User.findOne({ mobileNumber: mobile });

//     // First-time login — auto-register (role = vendor by default)
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

// // ✅ CHECK MOBILE — check whether the number is already registered
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
//       message: user ? "Mobile number is registered ✅" : "Mobile number is not registered ❌",
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

//     // ward is compulsory for counter_officer, survey_officer, A.M.C.
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

//     // counter_officer and A.M.C. get edit access by default
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

// // ✅ LOGIN (username + password) — for staff roles
// exports.loginUser = async (req, res) => {
//   try {
//     const { userName, password } = req.body;
//     if (!userName || !password) {
//       return res.status(400).json({ success: false, message: "Username and Password are required ❌" });
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

// // ✅ GET ALL USERS (filter by role / ward — for Super Admin)
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


// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const generateJwt = require("../utils/generateJwt");
// const sendWhatsAppOtp = require("../utils/sendWhatsAppOtp");
// const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// // ══════════════════════════════════════════════
// //  OTP LOGIN (Vendor / Citizen — mobile number based)
// // ══════════════════════════════════════════════

// // ✅ SEND OTP — generate OTP and send via WhatsApp
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

//     return res.status(200).json({ success: true, message: "OTP sent ✅" });
//   } catch (error) {
//     console.log("SendOTP Error:", error);
//     return res.status(500).json({ success: false, message: "Error sending OTP ❌" });
//   }
// };

// // ✅ VERIFY OTP + LOGIN — if mobile is already registered then login, otherwise create a new vendor account
// exports.verifyOtpLogin = async (req, res) => {
//   try {
//     const { mobileNo, otp, fullName } = req.body;

//     if (!mobileNo || !otp) {
//       return res.status(400).json({ success: false, message: "Mobile number and OTP are required ❌" });
//     }

//     const mobile = mobileNo.trim();
//     const result = checkOtp(mobile, otp);
//     if (!result.valid) {
//       return res.status(400).json({ success: false, message: result.reason });
//     }

//     let user = await User.findOne({ mobileNumber: mobile });

//     // First-time login — auto-register (role = vendor by default)
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

// // ✅ CHECK MOBILE — check whether the number is already registered
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
//       message: user ? "Mobile number is registered ✅" : "Mobile number is not registered ❌",
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

//     // ward is compulsory for counter_officer, survey_officer, A.M.C.
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

//     // counter_officer and A.M.C. get edit access by default
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

// // ✅ LOGIN (username + password) — for staff roles
// exports.loginUser = async (req, res) => {
//   try {
//     const { userName, password } = req.body;
//     if (!userName || !password) {
//       return res.status(400).json({ success: false, message: "Username and Password are required ❌" });
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

// // ✅ PASSWORD LOGIN (Vendor) — identifier can be username OR mobile number ONLY.
// // Application number is intentionally NOT accepted here — it's used for searching/looking
// // up an application elsewhere in the app, never for authentication. This is an alternative
// // to OTP login; the vendor's password defaults to their own mobile number when their account
// // is auto-created by a Counter Officer, and they can also log in the normal OTP way at any
// // time regardless of which one they used last.
// exports.loginWithIdentifier = async (req, res) => {
//   try {
//     const { identifier, password } = req.body;
//     if (!identifier || !password) {
//       return res.status(400).json({ success: false, message: "Identifier and password are required ❌" });
//     }

//     const value = identifier.trim();
//     let user = null;

//     // 1) Try as username
//     user = await User.findOne({ userName: value.toLowerCase() });

//     // 2) Try as mobile number (10 digits)
//     if (!user && /^\d{10}$/.test(value)) {
//       user = await User.findOne({ mobileNumber: value });
//     }

//     if (!user) {
//       return res.status(404).json({ success: false, message: "No account found for this username or mobile number ❌" });
//     }

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
//         mobileNumber: user.mobileNumber,
//         role: user.role,
//         ward: user.ward,
//         editAccess: user.editAccess,
//         departmentName: user.departmentName,
//         office: user.office,
//       },
//     });
//   } catch (error) {
//     console.log("LoginWithIdentifier Error:", error);
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

// // ✅ GET ALL USERS (filter by role / ward — for Super Admin)
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
const sendSmsOtp = require("../utils/sendSmsOtp");
const { setOtp, verifyOtp: checkOtp } = require("../utils/otpStore");

// ══════════════════════════════════════════════
//  OTP LOGIN (Vendor / Citizen — mobile number based)
// ══════════════════════════════════════════════

// ✅ SEND OTP — generate OTP and send via WhatsApp (existing, unchanged) + SMS (new, login template)
exports.sendOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (!mobileNo || !/^\d{10}$/.test(mobileNo.trim())) {
      return res.status(400).json({ success: false, message: "Valid 10 digit mobile number required ❌" });
    }

    const mobile = mobileNo.trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    setOtp(mobile, otp);

    // ── Send on both channels — WhatsApp (original, unchanged) and SMS (new) ──
    await Promise.allSettled([sendWhatsAppOtp(mobile, otp), sendSmsOtp(mobile, otp, "login")]);

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

// ✅ PASSWORD LOGIN (Vendor) — identifier can be username OR mobile number ONLY.
// Application number is intentionally NOT accepted here — it's used for searching/looking
// up an application elsewhere in the app, never for authentication. This is an alternative
// to OTP login; the vendor's password defaults to their own mobile number when their account
// is auto-created by a Counter Officer, and they can also log in the normal OTP way at any
// time regardless of which one they used last.
// ✅ SEND REGISTRATION OTP (public) — verifies mobile ownership before vendor self-registration.
// Stored under a "reg:" prefix so it never collides with a login OTP for the same mobile.
exports.sendRegistrationOtp = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) {
      return res.status(400).json({ success: false, message: "Valid 10 digit mobile number required ❌" });
    }

    const mobile = mobileNumber.trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    setOtp(`reg:${mobile}`, otp);
    await sendSmsOtp(mobile, otp, "registration");

    return res.status(200).json({ success: true, message: "OTP sent ✅" });
  } catch (error) {
    console.log("SendRegistrationOtp Error:", error);
    return res.status(500).json({ success: false, message: "Error sending OTP ❌" });
  }
};

// ✅ VENDOR SELF-REGISTRATION (public) — username + mobile number + password, verified by OTP.
// For a vendor who has never logged in before (no OTP login yet, and no application filled
// in on their behalf by a Counter Officer). If a Counter Officer already created an account
// for this mobile number, we don't error out — we just let them set/confirm their password
// on that existing account instead of blocking them.
exports.registerVendor = async (req, res) => {
  try {
    let { fullName, userName, mobileNumber, password, otp } = req.body;

    fullName = fullName?.trim();
    userName = userName?.trim().toLowerCase();
    mobileNumber = mobileNumber?.trim();

    if (!fullName || !mobileNumber || !password || !otp) {
      return res.status(400).json({ success: false, message: "Full name, mobile number, password, and OTP are required ❌" });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number ❌ (10 digits required)" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters ❌" });
    }

    // ── Username is optional — defaults to the mobile number itself (same convention already
    //    used when a Counter Officer's application auto-creates a vendor account) ──
    if (!userName) userName = mobileNumber;

    // ── Verify the mobile number was actually confirmed via OTP before creating the account ──
    const otpResult = checkOtp(`reg:${mobileNumber}`, otp);
    if (!otpResult.valid) {
      return res.status(400).json({ success: false, message: otpResult.reason });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Account may already exist for this mobile number (e.g. a Counter Officer created an
    //    application for this vendor earlier, which auto-creates a vendor account). If so,
    //    just set/update the password + username instead of blocking with "already exists". ──
    let user = await User.findOne({ mobileNumber });

    if (user) {
      if (user.role !== "vendor") {
        return res.status(409).json({ success: false, message: "This mobile number is already registered as staff ❌" });
      }
      const usernameTaken = await User.findOne({ userName, _id: { $ne: user._id } });
      if (usernameTaken) {
        return res.status(409).json({ success: false, message: "Username already taken ❌" });
      }
      user.fullName = fullName;
      user.userName = userName;
      user.password = hashedPassword;
      await user.save();
    } else {
      const usernameTaken = await User.findOne({ userName });
      if (usernameTaken) {
        return res.status(409).json({ success: false, message: "Username already taken ❌" });
      }
      user = await User.create({
        fullName,
        userName,
        mobileNumber,
        password: hashedPassword,
        role: "vendor",
      });
    }

    const token = generateJwt(user);

    return res.status(201).json({
      success: true,
      message: "Registration Successful ✅",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        mobileNumber: user.mobileNumber,
        role: user.role,
        ward: user.ward,
      },
    });
  } catch (error) {
    console.log("RegisterVendor Error:", error);
    return res.status(500).json({ success: false, message: "Server Error ❌" });
  }
};

exports.loginWithIdentifier = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Identifier and password are required ❌" });
    }

    const value = identifier.trim();
    let user = null;

    // 1) Try as username
    user = await User.findOne({ userName: value.toLowerCase() });

    // 2) Try as mobile number (10 digits)
    if (!user && /^\d{10}$/.test(value)) {
      user = await User.findOne({ mobileNumber: value });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found for this username or mobile number ❌" });
    }

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
        mobileNumber: user.mobileNumber,
        role: user.role,
        ward: user.ward,
        editAccess: user.editAccess,
        departmentName: user.departmentName,
        office: user.office,
      },
    });
  } catch (error) {
    console.log("LoginWithIdentifier Error:", error);
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