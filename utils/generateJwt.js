// const jwt = require("jsonwebtoken");

// const generateJwt = (user) => {
//   return jwt.sign(
//     { id: user._id, userName: user.userName, role: user.role, ward: user.ward },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };

// module.exports = generateJwt;


const jwt = require("jsonwebtoken");

const generateJwt = (user) => {
  return jwt.sign(
    { id: user._id, userName: user.userName, role: user.role, ward: user.ward, mobileNumber: user.mobileNumber || "" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateJwt;
