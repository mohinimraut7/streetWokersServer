const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.mimetype === "application/pdf") {
      return {
        folder: "svms/grievances/documents",
        resource_type: "raw",
        access_mode: "public",
        public_id: "grievance_doc_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
      };
    }
    return {
      folder: "svms/grievances/images",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }, { quality: "auto" }],
      public_id: "grievance_img_" + Date.now() + "_" + Math.round(Math.random() * 1e9),
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only pdf / jpg / jpeg / png allowed ❌"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = upload.array("documents", 5);
