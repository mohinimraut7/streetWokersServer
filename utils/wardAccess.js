// ── Ward-wise access control helper ──
// counter_officer, survey_officer, concern_officer — तिघेही ward-wise (Ward A - Ward I) असतात.
// प्रत्येकाला फक्त त्यांच्या स्वतःच्या ward च्या applications/grievances वरच काम करता येते.
// super_admin ला कुठलाही restriction नाही.

const WARD_SCOPED_ROLES = ["counter_officer", "survey_officer", "concern_officer"];

/**
 * @param {object} user           req.user (JWT payload: id, userName, role, ward)
 * @param {string} targetWard     ज्या application/grievance वर action होत आहे त्याचा ward
 * @returns {{ ok: boolean, message?: string }}
 */
exports.checkWardAccess = (user, targetWard) => {
  if (!user) return { ok: false, message: "Unauthorized ❌" };

  if (user.role === "super_admin") return { ok: true };

  if (!WARD_SCOPED_ROLES.includes(user.role)) return { ok: true }; // vendor/citizen ला लागू नाही

  if (!user.ward) {
    return { ok: false, message: "तुमच्या account ला ward assign नाही ❌ — Super Admin शी संपर्क करा" };
  }

  if (targetWard && user.ward !== targetWard) {
    return {
      ok: false,
      message: `Access denied ❌ — तुम्ही फक्त ${user.ward} च्या applications/grievances बघू किंवा edit करू शकता`,
    };
  }

  return { ok: true };
};

exports.WARD_SCOPED_ROLES = WARD_SCOPED_ROLES;
