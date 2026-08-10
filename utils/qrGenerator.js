const QRCode = require("qrcode");

// ── Vendor Smart Card साठी QR generate करा ──
// QR मध्ये verification URL encode केला जातो, जो QRVerification page उघडतो
const generateQrDataUrl = async (applicationNo) => {
  const verifyUrl = `${process.env.PORTAL_LINK}/verify/${applicationNo}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
  });
  return { verifyUrl, qrDataUrl };
};

module.exports = generateQrDataUrl;
