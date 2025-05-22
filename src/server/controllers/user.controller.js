const mongoose = require("mongoose");
import Company from "../models/company.mongo";
import { USER_ROLES } from "../models/enums/user.enums";
import Plan from "../models/plan.mongo";
import User from "../models/users.mongo";
import CommonAggregation from "../services/AggregateWithPagination";
import Email from "../services/Email";
import sendResponse from "../services/response";
import { privileges } from "../services/utilities";
const objectId = mongoose.Types.ObjectId.createFromHexString;

const user = {
  getRole: async (req, res) => {
    try {
      let userId = req.decoded._id;

      let user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      }).select("role");

      if (user) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User role.",
          payload: { role: user.role },
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "User not found.",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  getUserProfile: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      }).select({ password: 0 });
      if (user) {
        const userProfile = await user.getProfile();
        const response = {
          ...userProfile,
        };
        if (req.storageWarning) {
          response.warning = req.storageWarning;
        }
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User details.",
          payload: response,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "User not found.",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  addUser: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let newUser = { ...req.body };
      const oldUser = await User.findOne({ email: newUser.email });
      if (oldUser) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: `A user with this email (${newUser.email}) already exists.`,
          res,
        });
      } else {
        const loggedInUser = await User.findById(userId);

        // Get parent company and its plan
        const parentCompany = await Company.findById(
          loggedInUser.parentCompany
        );
        if (!parentCompany) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: "Parent company not found.",
            res,
          });
        }

        // Check if parent company has a plan
        if (!parentCompany.activePlan) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: "Parent company does not have an active plan.",
            res,
          });
        }

        // Get the plan details
        const plan = await Plan.findById(parentCompany.activePlan);
        if (!plan) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: "Plan not found.",
            res,
          });
        }

        // Count existing users for this parent company
        const userCount = await User.countDocuments({
          parentCompany: loggedInUser.parentCompany,
          isDeleted: false,
        });

        // Check if user limit is exceeded
        if (userCount >= plan.maxUsers) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: `Maximum user limit (${plan.maxUsers}) reached for your plan. Please upgrade your plan to add more users.`,
            res,
          });
        }

        newUser.createdBy = userId;
        newUser.parentCompany = loggedInUser.parentCompany;
        const tempPassword = await User.generateTempPassword();

        let user = await User.create({
          ...newUser,
          password: tempPassword,
        });

        if (user) {
          await new Email({
            to: user.email,
            name: user.fullName,
            email: user.email,
            password: tempPassword,
          }).sendWelcome();

          return sendResponse({
            status: "success",
            statusCode: 200,
            message: "User added successfully.",
            payload: {},
            res,
          });
        } else {
          return sendResponse({
            status: "fail",
            statusCode: 401,
            message: "Something went wrong!",
            res,
          });
        }
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  getAdminUsersList: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let {
        limit = 10,
        page = 1,
        sortKey,
        sortOrder,
        searchString,
        searchKeys,
        filterData,
      } = req.query;

      const pipeline = [
        {
          $match: {
            createdBy: objectId(userId),
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: Company.collection.name,
            localField: "companies.company",
            foreignField: "_id",
            pipeline: [
              {
                $sort: {
                  companyName: 1,
                },
              },
            ],
            as: "companies",
          },
        },
        {
          $addFields: {
            fullName: { $concat: ["$firstName", " ", "$lastName"] },
          },
        },
      ];
      if (sortKey === "companies") {
        pipeline.push({
          $addFields: {
            firstUserCompanyName: {
              $arrayElemAt: ["$companies.companyName", 0],
            },
          },
        });
        sortKey = "firstUserCompanyName";
      }
      const users = await new CommonAggregation({
        Model: User,
        pipeline,
        query: {
          limit,
          page,
          sortKey,
          sortOrder,
          searchString,
          searchKeys,
          filterData,
        },
      }).getAggregateWithPagination();

      if (users) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Users list.",
          payload: users,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "Soemething went wrong!",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  getUserDetails: async (req, res) => {
    try {
      let userId = req.params.id;
      let user = await User.findOne({
        _id: objectId(userId),
        isDeleted: false,
      })
        .select({ password: 0 })
        .populate({
          path: "companies.company",
          match: { isDeleted: false },
        })
        .lean();

      if (user) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User details.",
          payload: { ...user },
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "User not found.",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  updateUserDetails: async (req, res) => {
    try {
      let userId = req.params.id;
      let updateUser = { ...req.body };
      const updatedUser = await User.updateOne(
        { _id: userId },
        { ...updateUser }
      );

      if (updatedUser) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User details updated successfully.",
          payload: updateUser,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Soemething went wrong!",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  activateDeactivate: async (req, res) => {
    try {
      let userId = req.params.id;
      const updateUser = await User.updateOne(
        { _id: userId },
        { isActive: req.body.isActive }
      );

      if (updateUser) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User updated successfully.",
          payload: updateUser,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Soemething went wrong!",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  delete: async (req, res) => {
    try {
      let userId = req.params.id;
      const deleteUser = await User.updateOne(
        { _id: userId },
        { isDeleted: true }
      );

      if (deleteUser) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "User deleted successfully.",
          payload: deleteUser,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "Soemething went wrong!",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  getUserPrivileges: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let { companyId } = req.params;
      let user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      });
      if (user) {
        if (user.role === USER_ROLES.ADMIN) {
          return sendResponse({
            status: "success",
            statusCode: 200,
            message: "User details.",
            payload: privileges.admin,
            res,
          });
        } else {
          user = await User.findOne({
            _id: objectId(userId),
            companies: { $elemMatch: { company: objectId(companyId) } },
            isVerified: true,
            isDeleted: false,
          }).select({
            role: 1,
            "companies.$": 1,
          });
          if (user) {
            const companyPrivileges =
              { ...user.companies[0]?.privileges } || {};

            return sendResponse({
              status: "success",
              statusCode: 200,
              message: "User details.",
              payload:
                user.role === USER_ROLES.ADMIN
                  ? privileges.admin
                  : companyPrivileges,
              res,
            });
          } else {
            return sendResponse({
              status: "fail",
              statusCode: 400,
              message: "User not found.",
              res,
            });
          }
        }
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "User not found.",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  validateBulkUsersUpload: async (req, res) => {
    try {
      let adminId = req.decoded._id;
      const usersData = req.body;

      if (!Array.isArray(usersData) || usersData.length === 0) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Invalid data format. Expected an array of users.",
          res,
        });
      }
      // Check for unique emails
      const emails = usersData.map((user) => user.email?.toLowerCase());
      const duplicateEmails = emails.filter(
        (email, index) => emails.indexOf(email) !== index
      );

      // Check existing emails in DB
      const existingUsers = await User.find({
        email: { $in: emails },
        isDeleted: false,
      }).select("email firstName lastName");

      const existingEmails = new Set(
        existingUsers.map((u) => u.email.toLowerCase())
      );

      // Process company references
      const companyMap = new Map();
      const companyNumbers = new Set();

      // Collect all company numbers
      usersData.forEach((user) => {
        if (user.companies && Array.isArray(user.companies)) {
          user.companies.forEach((company) => {
            const companyNumber =
              typeof company === "string" ? company : company.companyNumber;
            if (companyNumber) companyNumbers.add(companyNumber);
          });
        }
      });

      // Fetch and validate companies
      if (companyNumbers.size > 0) {
        const companies = await Company.find({
          companyNumber: { $in: Array.from(companyNumbers) },
          isDeleted: false,
        }).select("_id companyNumber");

        companies.forEach((company) => {
          companyMap.set(company.companyNumber, company._id);
        });
      }

      // Validate each user
      const validatedData = usersData.map((userData) => {
        const errors = {};

        // Required fields validation
        if (!userData.firstName?.trim())
          errors.firstName = "First Name is required";
        if (!userData.lastName?.trim())
          errors.lastName = "Last Name is required";
        if (!userData.email?.trim()) errors.email = "Email is required";
        if (!userData.role) errors.role = "Role is required";
        if (!userData.type) errors.type = "User Type is required";

        // Email validation
        if (userData.email) {
          const email = userData.email.toLowerCase();
          if (duplicateEmails.includes(email)) {
            errors.email = "Duplicate email in uploaded data";
          }
          if (existingEmails.has(email)) {
            errors.email = "Email already exists";
          }
        }

        // Company validation
        if (userData.companies?.length > 0) {
          const invalidCompanies = userData.companies.filter((company) => {
            const companyNumber =
              typeof company === "string" ? company : company.companyNumber;
            return !companyMap.has(companyNumber);
          });
          if (invalidCompanies.length > 0) {
            errors.companies = `Invalid company numbers: ${invalidCompanies.join(
              ", "
            )}`;
          }
        } else {
          errors.companies = "At least one company is required";
        }

        // Phone validation
        if (userData.phone && !userData.countryCode) {
          errors.phone = "Country code is required with phone number";
        }

        return {
          ...userData,
          isInvalid: Object.keys(errors).length,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
        };
      });

      return sendResponse({
        status: "success",
        statusCode: 200,
        message: "Validation completed",
        payload: {
          summary: {
            totalRecords: usersData.length,
            validRecords: validatedData.filter((user) => !user.isInvalid)
              .length,
            invalidRecords: validatedData.filter((user) => user.isInvalid)
              .length,
          },
          csvData: validatedData,
        },
        res,
      });
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  bulkUploadUsers: async (req, res) => {
    try {
      let adminId = req.decoded._id;
      const usersData = req.body;

      if (!Array.isArray(usersData) || usersData.length === 0) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Invalid data format. Expected an array of users.",
          res,
        });
      }

      // Get admin's parent company
      const loggedInAdmin = await User.findById(adminId);

      // Step 1: Check for unique emails
      const emails = usersData.map((user) => user.email.toLowerCase());
      const uniqueEmails = new Set(emails);

      if (uniqueEmails.size !== emails.length) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Duplicate email addresses found in the uploaded data.",
          res,
        });
      }

      // Check if any emails already exist in the database
      const existingUsers = await User.find({
        email: { $in: emails },
        isDeleted: false,
      }).select("email firstName lastName");

      if (existingUsers.length > 0) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Some email addresses already exist in the database.",
          payload: existingUsers.map((u) => ({
            email: u.email,
            name: `${u.firstName} ${u.lastName}`,
          })),
          res,
        });
      }

      // Step 2: Process company references
      const companyMap = new Map();
      const companyNumbers = [];
      const invalidCompanyNumbers = new Set();

      // Collect all company numbers
      usersData.forEach((user) => {
        if (user.companies && Array.isArray(user.companies)) {
          user.companies.forEach((company) => {
            const companyNumber =
              typeof company === "string" ? company : company.companyNumber;
            companyNumbers.push(companyNumber);
          });
        }
      });

      // Fetch and validate companies
      if (companyNumbers.length > 0) {
        const companies = await Company.find({
          companyNumber: { $in: companyNumbers },
          isDeleted: false,
        }).select("_id companyNumber");

        companies.forEach((company) => {
          companyMap.set(company.companyNumber, company._id);
        });

        // Check for invalid company numbers
        companyNumbers.forEach((number) => {
          if (!companyMap.has(number)) {
            invalidCompanyNumbers.add(number);
          }
        });

        if (invalidCompanyNumbers.size > 0) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: "Some company numbers are invalid or not found",
            payload: {
              invalidCompanies: Array.from(invalidCompanyNumbers),
            },
            res,
          });
        }
      }

      // Step 3: Create users
      const createdUsers = [];
      const failedUsers = [];

      for (const userData of usersData) {
        try {
          const newUser = { ...userData };
          newUser.parentCompany = loggedInAdmin.parentCompany;
          newUser.createdBy = adminId;

          // Process company references
          if (newUser.companies && Array.isArray(newUser.companies)) {
            const processedCompanies = [];

            for (const companyRef of newUser.companies) {
              const companyNumber =
                typeof companyRef === "string"
                  ? companyRef
                  : companyRef.companyNumber;
              const companyId = companyMap.get(companyNumber);

              if (companyId) {
                processedCompanies.push({
                  company: companyId,
                  privileges: privileges.user, // Default privileges for all users
                });
              }
            }

            newUser.companies = processedCompanies;
          }

          const tempPassword = await User.generateTempPassword();

          // Create user with explicit fields
          const user = await User.create({
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email.toLowerCase(),
            title: newUser.title,
            countryCode: newUser.countryCode,
            phone: newUser.phone,
            role: newUser.role,
            type: newUser.type,
            companies: newUser.companies,
            parentCompany: newUser.parentCompany,
            createdBy: newUser.createdBy,
            password: tempPassword,
            isVerified: true,
            isActive: true,
          });

          // Send welcome email with temporary password
          await new Email({
            to: user.email,
            name: user.fullName,
            email: user.email,
            password: tempPassword,
          }).sendWelcome();

          createdUsers.push({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            companies: user.companies,
          });
        } catch (error) {
          console.error(`Error creating user ${userData.email}:`, error);
          failedUsers.push({
            email: userData.email,
            error: error.message,
          });
        }
      }

      return sendResponse({
        status: "success",
        statusCode: 200,
        message: "Users uploaded successfully.",
        payload: {
          totalUsers: createdUsers.length,
          createdUsers,
          failedUsers,
        },
        res,
      });
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  updateProfile: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let updateData = { ...req.body };

      // Find the user and check if they exist
      let user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      });

      if (!user) {
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "User not found.",
          res,
        });
      }

      // For admin users, handle company updates
      if (user.role === USER_ROLES.ADMIN) {
        // If company data is provided
        if (updateData.companyName || updateData?.companyLogo) {
          const company = await Company.findById(user.parentCompany);

          if (!company) {
            return sendResponse({
              status: "fail",
              statusCode: 404,
              message: "Company not found.",
              res,
            });
          }

          // Update company name if provided
          if (updateData.companyName) {
            company.companyName = updateData.companyName;
          }

          // Update company logo if provided
          if (updateData.companyLogo) {
            company.companyLogo = updateData.companyLogo;
          }

          await company.save();

          // Remove company fields from user update data
          delete updateData.companyName;
          delete updateData.companyLogo;
        }
      }

      // Update user fields
      const allowedFields = [
        "firstName",
        "lastName",
        "phone",
        "countryCode",
        "title",
        "profilePicture",
      ];
      const updateFields = {};

      allowedFields.forEach((field) => {
        if (updateData[field]) {
          updateFields[field] = updateData[field];
        }
      });

      // Update user
      const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
        new: true,
      }).select({ password: 0 });

      if (updatedUser) {
        const userProfile = await updatedUser.getProfile();
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Profile updated successfully.",
          payload: userProfile,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 500,
          message: "Failed to update profile.",
          res,
        });
      }
    } catch (err) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
};

export default user;
