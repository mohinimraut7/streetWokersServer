const jwt = require("jsonwebtoken");

// ── Login असणे आवश्यक (JWT verify) ──
exports.protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token missing ❌" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, userName, role, ward }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token ❌" });
  }
};

// ── ठराविक roles लाच access ──  usage: allowRoles("counter_officer", "super_admin")
exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied ❌ (Role not allowed)" });
    }
    next();
  };
};

// ── Officer फक्त स्वतःच्या ward च्या data वर काम करू शकतो (super_admin ला सूट) ──
exports.enforceWard = (req, res, next) => {
  if (req.user.role === "super_admin") return next();

  const requestWard = req.body.ward || req.query.ward;
  if (requestWard && req.user.ward && requestWard !== req.user.ward) {
    return res.status(403).json({
      success: false,
      message: `Access denied ❌ — तुम्ही फक्त ${req.user.ward} च्या applications बघू शकता`,
    });
  }
  next();
};
