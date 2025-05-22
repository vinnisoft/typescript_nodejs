const multer = require("multer");
const { uploadFile } = require("../services/s3");

const mongoose = require("mongoose");
const { default: User } = require("../models/users.mongo");
const { default: Company } = require("../models/company.mongo");
const { PLAN_TYPES } = require("../models/enums/plan.enum");
const objectId = mongoose.Types.ObjectId.createFromHexString;

// Configure Multer to use memory storage instead of disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (adjust as needed)
  },
});

/**
 * Middleware for handling file uploads (single & multiple)
 * @param {boolean} multiple - Set `true` for multiple file uploads.
 */
const fileUpload = (fieldNames, addFileName = false) => {
  return async (req, res, next) => {
    let companyFolder;
    let bucketName;
    let userId;
    let parentCompany;
    try {
      if (req.decoded && req.decoded._id) {
        userId = req.decoded._id;

        if (req.body.createdBy) {
          userId = req.body.createdBy;
        }

        // Find the user and get their parent company
        const user = await User.findOne({
          _id: objectId(userId),
          isVerified: true,
          isDeleted: false,
        })
          .select("parentCompany")
          .lean();

        if (user && user.parentCompany) {
          parentCompany = user.parentCompany;
          // Find company to get plan type
          const company = await Company.findById(user.parentCompany)
            .populate("activePlan")
            .select("planType")
            .lean();

          if (company) {
            // Set bucket prefix and name based on plan type
            const prefix =
              // company.activePlan.planType === PLAN_TYPES.FREE
              //   ?
              process.env.S3_FREE_USER_BUCKET_PREFIX;
            // : process.env.S3_PAID_USER_BUCKET_PREFIX;

            bucketName =
              // company.activePlan.planType === PLAN_TYPES.FREE
              //   ?
              process.env.S3_FREE_USER_BUCKET_NAME;
            // : process.env.S3_PAID_USER_BUCKET_NAME;

            // Set the base path structure with appropriate prefix
            companyFolder = `${prefix}/${user.parentCompany.toString()}`;
          }
        }
      }
    } catch (error) {
      console.error("Error finding parent company:", error);
    }

    // Set default values if still undefined
    if (!companyFolder) {
      companyFolder = `${process.env.S3_FREE_USER_BUCKET_PREFIX}/default`;
    }
    if (!bucketName) {
      bucketName = process.env.S3_FREE_USER_BUCKET_NAME;
    }

    if (!fieldNames || Object.keys(fieldNames).length === 0) {
      return next();
    }

    const fields = Object.keys(fieldNames).map((field) => ({
      name: field,
      maxCount: fieldNames[field] ? undefined : 1,
    }));
    const multerUpload = upload.fields(fields);

    multerUpload(req, res, async (err) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ success: false, message: "File upload failed" });
      }

      if ((!req.file && !req.files) || req.files?.length === 0) {
        // If no files are uploaded, just parse the fields if they exist
        try {
          for (const field in fieldNames) {
            if (req.body[field]) {
              const isMultiple = fieldNames[field];
              if (isMultiple) {
                if (Array.isArray(req.body[field])) {
                  req.body[field] = req.body[field].map((file) =>
                    typeof file === "string" ? JSON.parse(file) : file
                  );
                } else {
                  req.body[field] =
                    typeof req.body[field] === "string"
                      ? JSON.parse(req.body[field])
                      : req.body[field];
                }
              } else {
                req.body[field] =
                  typeof req.body[field] === "string"
                    ? JSON.parse(req.body[field])
                    : req.body[field];
              }
            } else {
              // If field doesn't exist in body, initialize with empty value
              req.body[field] = fieldNames[field] ? [] : null;
            }
          }
        } catch (error) {
          console.log("Error parsing field:", error);
        }
        return next();
      }

      try {
        let totalUploadSize = 0; // Track total size of uploaded files

        for (const field in fieldNames) {
          const isMultiple = fieldNames[field];
          if (req.files && req.files[field]) {
            if (isMultiple) {
              let existingFiles = [];
              if (req.body[field]) {
                if (Array.isArray(req.body[field])) {
                  existingFiles = req.body[field].map((file) =>
                    JSON.parse(file)
                  );
                } else {
                  existingFiles = JSON.parse(req.body[field]);
                }
              }

              // Update multiple files upload with company-specific path
              const newFiles = await Promise.all(
                req.files[field].map(async (file) => {
                  try {
                    const { buffer, mimetype, originalname, size } = file;
                    totalUploadSize += size; // Add file size to total

                    const s3Path = `${companyFolder}/${field}`;
                    const result = await uploadFile(
                      bucketName,
                      buffer,
                      originalname,
                      mimetype,
                      s3Path
                    );
                    if (result) {
                      const key = `${s3Path}/${originalname}`;
                      const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                      return addFileName
                        ? {
                            name: file.originalname,
                            url: s3Url,
                            size: file.size,
                            type: file.mimetype,
                          }
                        : s3Url;
                    }
                  } catch (error) {
                    console.error("Error uploading file:", error);
                    throw error;
                  }
                })
              );

              req.body[field] = [...existingFiles, ...newFiles];
            } else {
              // Single file upload with company-specific path
              if (req.files[field] && req.files[field].length > 0) {
                const file = req.files[field][0];
                const { buffer, mimetype, originalname, size } = file;
                totalUploadSize += size; // Add file size to total

                let s3Path;
                if (field === "profilePicture") {
                  s3Path = `${companyFolder}/${userId}/${field}`;
                } else {
                  s3Path = `${companyFolder}/${field}`;
                }
                const result = await uploadFile(
                  bucketName,
                  buffer,
                  originalname,
                  mimetype,
                  s3Path
                );
                if (result) {
                  const key = `${s3Path}/${originalname}`;
                  const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                  req.body[field] = addFileName
                    ? {
                        name: file.originalname,
                        url: s3Url,
                        size: file.size,
                        type: file.mimetype,
                      }
                    : s3Url;
                }
              } else {
                req.body[field] = JSON.parse(req.body[field]);
              }
            }
          } else {
            if (isMultiple) {
              if (Array.isArray(req.body[field])) {
                req.body[field] = req.body[field].map((file) => {
                  try {
                    return typeof file === "string" ? JSON.parse(file) : file;
                  } catch (e) {
                    return file;
                  }
                });
              } else if (req.body[field]) {
                try {
                  req.body[field] =
                    typeof req.body[field] === "string"
                      ? JSON.parse(req.body[field])
                      : req.body[field];
                } catch (e) {
                  req.body[field] = req.body[field];
                }
              } else {
                req.body[field] = [];
              }
            } else {
              if (req.body[field]) {
                try {
                  req.body[field] =
                    typeof req.body[field] === "string"
                      ? JSON.parse(req.body[field])
                      : req.body[field];
                } catch (e) {
                  req.body[field] = req.body[field];
                }
              } else {
                req.body[field] = null;
              }
            }
          }
        }

        // Update company's storage usage if files were uploaded
        if (totalUploadSize > 0 && parentCompany) {
          await Company.findByIdAndUpdate(parentCompany, {
            $inc: { storageUsed: totalUploadSize },
          });
        }

        next();
      } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
      }
    });
  };
};

module.exports = fileUpload;
