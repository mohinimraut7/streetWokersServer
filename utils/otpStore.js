// ── Simple in-memory OTP store (5 min expiry) ──
// Production मध्ये Redis वापरणे चांगले, पण छोट्या प्रोजेक्टसाठी हे पुरेसे आहे.
const otpMap = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

exports.setOtp = (mobile, otp) => {
  otpMap.set(mobile, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });
};

exports.verifyOtp = (mobile, otp) => {
  const record = otpMap.get(mobile);
  if (!record) return { valid: false, reason: "OTP not found, resend करा ❌" };
  if (Date.now() > record.expiresAt) {
    otpMap.delete(mobile);
    return { valid: false, reason: "OTP expired ❌" };
  }
  if (String(record.otp) !== String(otp)) {
    return { valid: false, reason: "Invalid OTP ❌" };
  }
  otpMap.delete(mobile);
  return { valid: true };
};
