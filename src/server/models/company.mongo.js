import { COMPANY_STATUS, COMPANY_TYPES } from "./enums/company.enums";
import { PLAN_TYPES } from "./enums/plan.enum";
import Plan from "./plan.mongo";
import User from "./users.mongo";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    companyType: {
      type: String,
      enum: {
        values: Object.values(COMPANY_TYPES),
        message: "{VALUE} is not supported in role enum",
      },
      default: COMPANY_TYPES.PARENT,
    },
    companyName: {
      type: String,
      default: "",
    },
    alias: {
      type: String,
      default: "",
    },
    previousName: {
      type: String,
      default: "",
    },
    business: {
      type: String,
      default: "",
    },
    yearEnd: {
      type: String,
      default: null,
    },
    companyNumber: {
      type: String,
      default: null,
    },
    taxRefNumber: {
      type: String,
      default: "",
    },
    vatRefNumber: {
      type: String,
      default: "",
    },
    registeredAddress: {
      type: String,
      default: "",
    },
    registeredAddressCountry: {
      type: Schema.Types.Mixed,
      default: null,
    },
    registeredAddressCity: {
      type: String,
      default: null,
    },
    registeredAddressPostcode: {
      type: String,
      default: "",
    },
    businessAddress: {
      type: String,
      default: "",
    },
    businessAddressCountry: {
      type: Schema.Types.Mixed,
      default: null,
    },
    businessAddressCity: {
      type: String,
      default: null,
    },
    businessAddressPostcode: {
      type: String,
      default: "",
    },
    currency: {
      type: String,
      default: "",
    },
    shareHoldings: [
      {
        company: {
          type: Schema.Types.ObjectId,
          ref: "Company",
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        acquisitionDate: {
          type: Date,
          default: () => Date.now(),
        },
        _id: false,
      },
    ],
    companyLogo: {
      type: String,
      default: "",
    },
    companyDataCustomFieldValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
    registeredAddressCustomFieldValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
    businessAddressCustomFieldValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
    parentCompany: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    reSellerRef: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value.length === 10 && /^[a-zA-Z0-9]+$/.test(value);
        },
        message:
          "Reseller reference must be exactly 10 alphanumeric characters.",
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(COMPANY_STATUS),
        message: "{VALUE} is not supported in role enum",
      },
      default: COMPANY_STATUS.INACTIVE,
    },
    activePlan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
    activeTransaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

companySchema.pre("save", async function (next) {
  if (this.isNew && this.companyType === COMPANY_TYPES.PARENT) {
    this._isNewDocument = true;
  }

  // Set storage quota based on company type and plan
  if (this.companyType === COMPANY_TYPES.MAIN) {
    // Convert GB to bytes for storage calculations
    const GB = 1024 * 1024 * 1024;
    const TB = 1024 * GB;

    if (this.planType === PLAN_TYPES.FREE) {
      this.storageQuota = 500 * GB; // 500GB for free plan
    } else if (this.planType === PLAN_TYPES.PAID) {
      this.storageQuota = 4 * TB; // 4TB for paid plan
    }
  }

  // Check for duplicate companyNumber if it's not null or empty
  if (this.isNew && this.companyNumber) {
    const existingCompany = await mongoose.models.Company.findOne({
      companyNumber: this.companyNumber,
      _id: { $ne: this._id },
    });

    if (existingCompany) {
      const error = new Error(
        "Company with this company number already exists"
      );
      return next(error);
    }
  }

  // Validate user count when changing to a lower tier plan
  // if (this.isModified("activePlan")) {
  //   const plan = await Plan.findById(this.activePlan);
  //   if (plan) {
  //     // Get current user count
  //     const userCount = await User.countDocuments({
  //       parentCompany: this._id,
  //       isDeleted: false
  //     });

  //     // Check if new plan's user limit is sufficient
  //     if (userCount > plan.maxUsers) {
  //       const error = new Error(
  //         `Cannot downgrade plan. You currently have ${userCount} users, but the new plan only allows ${plan.maxUsers} users. Please remove excess users before downgrading.`
  //       );
  //       return next(error);
  //     }

  //     // Validate paid plan has transaction
  //     if (plan.planType === PLAN_TYPES.PAID && !this.activeTransaction) {
  //       const error = new Error("Paid plans must have an associated transaction");
  //       return next(error);
  //     }
  //   }
  // }

  next();
});

// Add virtual property for remaining storage
companySchema.virtual("storageRemaining").get(function () {
  return Math.max(0, this.storageQuota - this.storageUsed);
});

// Add method to check if storage limit is reached
companySchema.methods.hasStorageAvailable = function (requiredBytes) {
  return this.storageRemaining >= requiredBytes;
};

// Add method to update storage usage
companySchema.methods.updateStorageUsed = async function (bytesAdded) {
  this.storageUsed += bytesAdded;
  return this.save();
};

// Add method to check if storage warning should be shown
companySchema.methods.shouldShowStorageWarning = function () {
  const GB = 1024 * 1024 * 1024;

  if (this.planType === PLAN_TYPES.FREE) {
    return this.storageRemaining < 10 * GB; // Less than 10 GB remaining for free plan
  } else if (this.planType === PLAN_TYPES.PAID) {
    return this.storageRemaining < 50 * GB; // Less than 50 GB remaining for paid plan
  }

  return false;
};

// Add method to get storage warning message
companySchema.methods.getStorageWarningMessage = function () {
  if (!this.shouldShowStorageWarning()) {
    return null;
  }

  const GB = 1024 * 1024 * 1024;
  const remainingGB = (this.storageRemaining / GB).toFixed(2);

  if (this.planType === PLAN_TYPES.FREE) {
    return `Warning: Your storage is running low. Only ${remainingGB} GB remaining, upgrade your plan to get more space.`;
  } else if (this.planType === PLAN_TYPES.PAID) {
    return `Warning: Your storage is running low. Only ${remainingGB} GB remaining out of your 4 TB.`;
  }

  return null;
};

// Uncomment these lines to force model recreation
// if (mongoose.models.Company) {
//   delete mongoose.models.Company;
// }

const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

export default Company;
