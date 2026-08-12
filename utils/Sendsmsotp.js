const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// ── Fortius Infocom SMS Gateway — DLT-approved templates ──
// senderid is fixed at "saaviinf" for both templates (per the approved template list).
const SMS_API_BASE = "https://smsfortius.work/V2/apikey.php";
const SMS_SENDER_ID = "saaviinf";

// Two approved templates — used for two different purposes:
//   LOGIN        → sent when an existing account logs in via OTP (vendor or staff)
//   REGISTRATION → sent when a new vendor is verifying their mobile number before self-registering
const TEMPLATES = {
  login: {
    id: "1607100000000379315",
    buildMessage: (otp) =>
      `Dear Citizen, Your OTP for VVCMC Jan Samvaad Portal login is ${otp}. This OTP is valid for 60 seconds. Do not share this OTP with anyone. SAAVI INFINET`,
  },
  registration: {
    id: "1607100000000379312",
    buildMessage: (otp) =>
      `Dear Citizen ${otp} is OTP for ${otp} login for citizen registration.${otp} SAAVI INFINET`,
  },
};

// purpose: "login" | "registration"
const sendSmsOtp = async (mobile, otp, purpose = "login") => {
  const template = TEMPLATES[purpose] || TEMPLATES.login;
  const message = template.buildMessage(otp);

  const apiKey = process.env.SMS_API_KEY || "dWaYXxSkYneCVvUL"; // move to .env as SMS_API_KEY — kept as fallback for now
  const url =
    `${SMS_API_BASE}?apikey=${encodeURIComponent(apiKey)}` +
    `&senderid=${encodeURIComponent(SMS_SENDER_ID)}` +
    `&templateid=${encodeURIComponent(template.id)}` +
    `&number=${encodeURIComponent(mobile)}` +
    `&message=${encodeURIComponent(message)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    console.log(`✅ SMS OTP sent (${purpose}) to ${mobile}:`, text);
    return { success: true, response: text };
  } catch (error) {
    console.error(`❌ SMS OTP send failed (${purpose}) to ${mobile}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendSmsOtp;