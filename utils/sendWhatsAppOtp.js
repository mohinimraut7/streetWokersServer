const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// ── WhatsApp OTP Send (जसा reference project मध्ये आहे) ──
const sendWhatsAppOtp = async (mobile, otp) => {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: `91${mobile}`,
    type: "template",
    template: {
      name: "citizen_otp",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: String(otp) }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: String(otp) }],
        },
      ],
    },
  };

  const res = await fetch(process.env.WA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WA_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("✅ WhatsApp OTP:", data);
  return data;
};

module.exports = sendWhatsAppOtp;
