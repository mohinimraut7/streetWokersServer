const express = require("express");
const router = express.Router();

const {
  registerUser, loginUser,
  sendOtp, verifyOtpLogin, checkMobile,
  updateUser, getUsers, deleteUser,
} = require("../controllers/userController");

const { protect, allowRoles } = require("../middlewares/auth");

// ── Vendor / Citizen OTP login (public) ──
router.post("/sendOtp", sendOtp);
router.post("/verifyOtpLogin", verifyOtpLogin);
router.post("/checkMobile", checkMobile);

// ── Staff login (public) ──
router.post("/login", loginUser);

// ── Staff registration (super_admin only) ──
router.post("/register", protect, allowRoles("super_admin"), registerUser);

// ── User management (super_admin only) ──
router.get("/getUsers", protect, allowRoles("super_admin"), getUsers);
router.patch("/users/:id", protect, allowRoles("super_admin"), updateUser);
router.delete("/deleteUser/:id", protect, allowRoles("super_admin"), deleteUser);

module.exports = router;
