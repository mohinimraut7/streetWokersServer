// // const multer = require("multer");
// // const { CloudinaryStorage } = require("multer-storage-cloudinary");
// // const cloudinary = require("../config/cloudinary");

// // const storage = new CloudinaryStorage({
// //   cloudinary,
// //   params: async (req, file) => {
// //     if (file.mimetype === "application/pdf") {
// //       return {
// //         folder: "svms/vendor-applications/documents",
// //         resource_type: "raw",
// //         access_mode: "public",
// //         public_id: "vendor_doc_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
// //       };
// //     }
// //     return {
// //       folder: "svms/vendor-applications/images",
// //       resource_type: "image",
// //       allowed_formats: ["jpg", "jpeg", "png", "webp"],
// //       transformation: [
// //         { width: 1000, height: 1000, crop: "limit" },
// //         { quality: "auto", fetch_format: "auto" },
// //       ],
// //       public_id: "vendor_img_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
// //     };
// //   },
// // });

// // const fileFilter = (req, file, cb) => {
// //   const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
// //   if (allowedTypes.includes(file.mimetype)) cb(null, true);
// //   else cb(new Error("Only pdf / jpg / jpeg / png allowed ❌"), false);
// // };

// // const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// // // vendorPhoto        → applicant photo
// // // documents           → multiple identity/shop proof documents
// // // surveyPhotos        → survey officer upload करतो (multiple)
// // module.exports = upload.fields([
// //   { name: "vendorPhoto", maxCount: 1 },
// //   { name: "documents", maxCount: 5 },
// //   { name: "surveyPhotos", maxCount: 10 },
// // ]);


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary");

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     if (file.mimetype === "application/pdf") {
//       return {
//         folder: "svms/vendor-applications/documents",
//         resource_type: "raw",
//         access_mode: "public",
//         public_id: "vendor_doc_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
//       };
//     }
//     return {
//       folder: "svms/vendor-applications/images",
//       resource_type: "image",
//       allowed_formats: ["jpg", "jpeg", "png", "webp"],
//       transformation: [
//         { width: 1000, height: 1000, crop: "limit" },
//         { quality: "auto", fetch_format: "auto" },
//       ],
//       public_id: "vendor_img_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
//     };
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
//   if (allowedTypes.includes(file.mimetype)) cb(null, true);
//   else cb(new Error("Only pdf / jpg / jpeg / png allowed ❌"), false);
// };

// const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// // vendor sathi frontend मध्ये (Step4Documents.jsx) 5 वेगळे named uploads आहेत,
// // त्यामुळे इथे प्रत्येक document type साठी वेगळं field ठेवलं आहे (generic "documents" array ऐवजी)
// // surveyPhotos → survey officer upload करतो (multiple)
// module.exports = upload.fields([
//   { name: "photo", maxCount: 1 },
//   { name: "aadhaarCard", maxCount: 1 },
//   { name: "panCard", maxCount: 1 },
//   { name: "addressProof", maxCount: 1 },
//   { name: "businessProof", maxCount: 1 },
//   { name: "surveyPhotos", maxCount: 10 },
// ]);




// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary");

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     if (file.mimetype === "application/pdf") {
//       return {
//         folder: "svms/vendor-applications/documents",
//         resource_type: "raw",
//         access_mode: "public",
//         public_id: "vendor_doc_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
//       };
//     }
//     return {
//       folder: "svms/vendor-applications/images",
//       resource_type: "image",
//       allowed_formats: ["jpg", "jpeg", "png", "webp"],
//       transformation: [
//         { width: 1000, height: 1000, crop: "limit" },
//         { quality: "auto", fetch_format: "auto" },
//       ],
//       public_id: "vendor_img_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
//     };
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
//   if (allowedTypes.includes(file.mimetype)) cb(null, true);
//   else cb(new Error("Only pdf / jpg / jpeg / png allowed ❌"), false);
// };

// const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// // vendorPhoto        → applicant photo
// // documents           → multiple identity/shop proof documents
// // surveyPhotos        → survey officer upload करतो (multiple)
// module.exports = upload.fields([
//   { name: "vendorPhoto", maxCount: 1 },
//   { name: "documents", maxCount: 5 },
//   { name: "surveyPhotos", maxCount: 10 },
// ]);


const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.mimetype === "application/pdf") {
      return {
        folder: "svms/vendor-applications/documents",
        resource_type: "raw",
        access_mode: "public",
        public_id: "vendor_doc_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
      };
    }
    return {
      folder: "svms/vendor-applications/images",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1000, height: 1000, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
      public_id: "vendor_img_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only pdf / jpg / jpeg / png allowed ❌"), false);
};

// ── File size limit lowered from 50MB → 5MB. Client-side compression (FileUpload.jsx)
// already shrinks images to a few hundred KB before they're ever sent, so this is just a
// safety cap (e.g. a very large PDF, or a client that bypasses the browser-side check). ──
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// vendor sathi frontend मध्ये (Step4Documents.jsx) 5 वेगळे named uploads आहेत,
// त्यामुळे इथे प्रत्येक document type साठी वेगळं field ठेवलं आहे (generic "documents" array ऐवजी)
// surveyPhotos → survey officer upload करतो (multiple)
const uploadFields = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "businessProof", maxCount: 1 },
  { name: "surveyPhotos", maxCount: 10 },
]);

// ── Wraps the multer middleware so a too-large file (or wrong file type) returns the
// same clean JSON { success:false, message } shape as every other endpoint in this API,
// instead of falling through to Express's default HTML error page. ──
module.exports = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "One of your files is too large — please choose files under 5MB each and try again ❌",
      });
    }
    return res.status(400).json({ success: false, message: err.message || "File upload failed ❌" });
  });
};