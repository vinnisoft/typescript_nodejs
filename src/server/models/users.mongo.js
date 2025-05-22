const mongoose = require("mongoose");
import { USER_ROLES, USER_TYPES } from "./enums/user.enums";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { privileges } from "../services/utilities";
import Company from "./company.mongo";
import { getSignedUrl } from "../services/s3";
import { PLAN_TYPES } from "./enums/plan.enum";
import Plan from "./plan.mongo";
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      validate: [validator.isEmail, "Please provide a valid email address!"],
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    parentCompany: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    companies: {
      type: [
        {
          company: { type: Schema.Types.ObjectId, ref: "Company" },
          privileges: {
            type: {},
            default: privileges.user,
          },
        },
      ],
      _id: false,
      default: [],
    },
    countryCode: {
      type: Schema.Types.Mixed,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    password: { type: String },
    role: {
      type: String,
      enum: {
        values: Object.values(USER_ROLES),
        message: "{VALUE} is not supported in role enum",
      },
      default: USER_ROLES.USER,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(USER_TYPES),
        message: "{VALUE} is not supported in type enum",
      },
      default: USER_TYPES.INTERNAL,
    },
    stripeCustomerId: { type: String, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    passwordChangedAt: Date,
    passwordResetExpires: Date,
    lastLogin: Date,
    ipAddress: String,
    otp: String,
    otpCreatedAt: Date,
    resetPasswordOtp: String,
    resetPasswordOtpCreatedAt: Date,
    isFirstLogin: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("fullName").get(function () {
  const firstName = this.firstName ? `${this.firstName}` : "";
  const lastName = this?.lastName ? this?.lastName : "";

  return `${firstName}${lastName ? " " + lastName : ""}`;
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 3000);
  next();
});

userSchema.pre("findOneAndUpdate", async function (next) {
  if (!this._update.password) return next();
  this._update.password = await bcrypt.hash(this._update.password, 12);
  next();
});

userSchema.methods["createJWT"] = async function () {
  return jwt.sign(
    { _id: this["_id"], role: this["role"] },
    process.env["JWT_SECRET"] || "jwt_secret",
    {
      expiresIn: process.env["JWT_EXPIRES_IN"],
    }
  );
};

userSchema.statics.generateTempPassword = async function () {
  const tempPassword = Math.random().toString(36).slice(-8); // Generate 8-char temp password
  return tempPassword;
};

userSchema.methods["correctPassword"] = async function (password) {
  return await bcrypt.compare(password, this["password"]);
};

userSchema.methods["verifyOtp"] = async function (candidateOtp) {
  return candidateOtp === this["otp"];
};

userSchema.methods["verifyResetPasswordOtp"] = async function (candidateOtp) {
  return candidateOtp === this["resetPasswordOtp"];
};

userSchema.methods["getProfile"] = async function () {
  const profile = {
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
  };
  const company = await Company.findById(this.parentCompany)
    .populate("activePlan")
    .populate("activeTransaction")
    .lean();

  const prefix =
    // company.activePlan.planType === PLAN_TYPES.FREE
    //   ?
    process.env.S3_FREE_USER_BUCKET_PREFIX;
  // : process.env.S3_PAID_USER_BUCKET_PREFIX;

  const bucketName =
    // company.activePlan.planType === PLAN_TYPES.FREE
    // ?
    process.env.S3_FREE_USER_BUCKET_NAME;
  // : process.env.S3_PAID_USER_BUCKET_NAME;

  if (company && company.companyLogo) {
    // Extract just the filename from the full URL if it exists
    const logoFileName = company.companyLogo.split("/").pop();

    const s3Key = `${prefix}/${company._id}/companyLogo/${logoFileName}`;
    profile.companyLogo = await getSignedUrl(bucketName, s3Key, 3600);
  } else {
    profile.companyLogo = null;
  }

  // Only include companyName for user role, not for admin
  if (this.role === "admin") {
    profile.companyName = company.companyName;
    if (company.activePlan) profile.activePlan = company.activePlan;
    if (company.activeTransaction) {
      profile.activePlan.status =
        profile.activePlan.planType === PLAN_TYPES.FREE
          ? "active"
          : company.activeTransaction.status === "completed"
          ? "active"
          : company.activeTransaction.status;
    } else {
      profile.activePlan.status = "active";
    }
    profile.storageUsed = company.storageUsed;
    profile.phone = this.phone;
    profile.countryCode = this.countryCode;
  } else {
    if (this.profilePicture) {
      const profilePictureName = this.profilePicture.split("/").pop();
      const s3Key = `${prefix}/${company._id}/${this._id}/profilePicture/${profilePictureName}`;
      profile.profilePicture = await getSignedUrl(bucketName, s3Key, 3600);
    }
    profile.title = this.title;
    profile.type = this.type;
  }

  return profile;
};

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
