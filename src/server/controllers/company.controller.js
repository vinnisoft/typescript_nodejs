const mongoose = require("mongoose");
import Company from "../models/company.mongo";
import { FORM_TYPES } from "../models/enums/formBuilder.enums";
import { USER_TYPES } from "../models/enums/user.enums";
import FormBuilder from "../models/formBuilder.mongo";
import User from "../models/users.mongo";
import Plan from "../models/plan.mongo";
import CommonAggregation from "../services/AggregateWithPagination";
import sendResponse from "../services/response";
import { privileges } from "../services/utilities";
import CompanyDocument from "../models/companyDocument.mongo";
const objectId = mongoose.Types.ObjectId.createFromHexString;

const company = {
  formFields: async (req, res) => {
    try {
      let userId = req.decoded._id;
      const userParentCompany = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany")
        .lean();

      const pipeline = [
        {
          $match: {
            companyId: userParentCompany.parentCompany,
            formType: FORM_TYPES.COPMANY_DATA,
          },
        },
        {
          $unwind: "$fields",
        },
        {
          $match: {
            "fields.isActive": true,
          },
        },
        {
          $sort: {
            "fields.order": 1,
          },
        },
        {
          $group: {
            _id: "$_id",
            fields: { $push: "$fields" },
            formName: { $first: "$formName" },
            description: { $first: "$description" },
            companyId: { $first: "$companyId" },
            isActive: { $first: "$isActive" },
            createdBy: { $first: "$createdBy" },
            updatedBy: { $first: "$updatedBy" },
            isDeleted: { $first: "$isDeleted" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
          },
        },
      ];
      let companyFields = await new CommonAggregation({
        Model: FormBuilder,
        pipeline,
        query: {},
      }).getAggregateWithoutPagination();

      // Filter active children for parent type fields
      if (companyFields && companyFields.length > 0) {
        companyFields[0].fields = companyFields[0].fields.map((field) => {
          if (field.type === "parent" && Array.isArray(field.children)) {
            field.children = field.children.filter(
              (child) => child.isActive === true
            );
          }
          return field;
        });

        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company fields.",
          payload: companyFields[0],
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Company not found.",
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
  add: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let newCompanyData = { ...req.body };
      const loggedInUser = await User.findById(userId);

      // Determine the parent company ID
      const parentCompanyId = loggedInUser.parentCompany;
      if (!parentCompanyId) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Parent company not found.",
          res,
        });
      }

      // Get parent company and its plan
      const parentCompany = await Company.findById(parentCompanyId);
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

      // Count existing companies for this parent company
      const companyCount = await Company.countDocuments({
        parentCompany: parentCompanyId,
        isDeleted: false,
      });

      // Check if company limit is exceeded
      if (companyCount >= plan.maxCompanies) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: `Maximum company limit (${plan.maxCompanies}) reached for your plan. Please upgrade your plan to add more companies.`,
          res,
        });
      }

      // Set parent company
      if (!newCompanyData.parentCompany) {
        newCompanyData.parentCompany = loggedInUser.parentCompany;
      }

      let newCompany = await Company.create({
        ...newCompanyData,
      });

      if (newCompany) {
        if (loggedInUser.companies) {
          await User.updateOne(
            { _id: objectId(userId) },
            {
              $push: {
                companies: {
                  company: newCompany._id,
                  privileges:
                    User.type === USER_TYPES.INTERNAL
                      ? privileges.admin
                      : privileges.user,
                },
              },
            }
          );
        } else {
          await User.updateOne(
            { _id: objectId(userId) },
            {
              companies: {
                company: newCompany._id,
                privileges:
                  User.type === USER_TYPES.INTERNAL
                    ? privileges.admin
                    : privileges.user,
              },
            }
          );
        }
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company added successfully.",
          payload: { _id: newCompany._id },
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Something went wrong!",
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
  validateBulkCompaniesUpload: async (req, res) => {
    try {
      const companiesData = req.body;

      if (!Array.isArray(companiesData) || companiesData.length === 0) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Invalid data format. Expected an array of companies.",
          res,
        });
      }

      // Check for unique company numbers - convert all to strings for consistent comparison
      const companyNumbers = companiesData.map((company) =>
        String(company.companyNumber)
      );

      const duplicateCompanyNumbers = companyNumbers.filter(
        (number, index) => companyNumbers.indexOf(number) !== index
      );

      // Check existing company numbers in DB
      const existingCompanies = await Company.find({
        companyNumber: { $in: companyNumbers },
        isDeleted: false,
      }).select("companyNumber companyName");

      const existingCompanyNumbers = new Set(
        existingCompanies.map((c) => String(c.companyNumber))
      );

      // Process parent company references
      const parentCompanyMap = new Map();
      const parentCompanyNumbers = new Set();

      // Collect all parent company numbers
      companiesData.forEach((company) => {
        if (company.parentCompany && company.companyType === "SUBSIDIARY") {
          parentCompanyNumbers.add(String(company.parentCompany));
        }
      });

      // Fetch and validate parent companies
      if (parentCompanyNumbers.size > 0) {
        const parentCompanies = await Company.find({
          companyNumber: { $in: Array.from(parentCompanyNumbers) },
          isDeleted: false,
        }).select("_id companyNumber");

        parentCompanies.forEach((company) => {
          parentCompanyMap.set(String(company.companyNumber), company._id);
        });
      }

      // Create a set of all company numbers in the request for shareholding validation
      const allCompanyNumbersInRequest = new Set(companyNumbers);

      // Validate each company
      const validatedData = companiesData.map((companyData) => {
        const errors = {};

        // Basic field validations
        if (
          !companyData.companyName ||
          (typeof companyData.companyName === "string" &&
            !companyData.companyName.trim())
        )
          errors.companyName = "Company Name is required";

        if (
          !companyData.companyNumber ||
          (typeof companyData.companyNumber === "string" &&
            !companyData.companyNumber.trim())
        )
          errors.companyNumber = "Company Number is required";

        if (!companyData.companyType)
          errors.companyType = "Company Type is required";

        if (
          !companyData.registeredAddress ||
          (typeof companyData.registeredAddress === "string" &&
            !companyData.registeredAddress.trim())
        )
          errors.registeredAddress = "Registered Address is required";

        if (!companyData.registeredAddressCountry)
          errors.registeredAddressCountry =
            "Registered Address Country is required";

        // Company number validation
        if (companyData.companyNumber) {
          const companyNumberStr = String(companyData.companyNumber);
          if (duplicateCompanyNumbers.includes(companyNumberStr)) {
            errors.companyNumber = "Duplicate company number in uploaded data";
          }
          if (existingCompanyNumbers.has(companyNumberStr)) {
            errors.companyNumber = "Company number already exists in database";
          }
        }

        // Parent company validation
        if (
          companyData.companyType === "SUBSIDIARY" ||
          companyData.companyType === "subsidiary"
        ) {
          if (!companyData.parentCompany && !companyData.shareHoldings) {
            errors.parentCompany =
              "Parent company is required for subsidiary companies";
          } else if (
            !companyData.shareHoldings &&
            !parentCompanyMap.has(String(companyData.parentCompany)) &&
            !companyNumbers.includes(String(companyData.parentCompany))
          ) {
            errors.parentCompany = "Invalid parent company number";
          }
        }

        // ShareHoldings validation - only check against company numbers in the request
        if (
          companyData.shareHoldings &&
          Array.isArray(companyData.shareHoldings)
        ) {
          const invalidShareHoldings = companyData.shareHoldings.filter(
            (holding) => {
              // Get company identifier (either company or companyId field)
              const companyIdentifier = String(
                holding.company || holding.companyId
              );

              // Check if company identifier exists
              if (!companyIdentifier || companyIdentifier === "undefined")
                return true;

              // Check if percentage exists and is valid
              if (
                holding.percentage === undefined ||
                holding.percentage === null
              )
                return true;

              // Allow zero percentage
              if (isNaN(parseFloat(holding.percentage))) return true;

              // Check if company exists in the current upload data or in the database
              return (
                !companyNumbers.includes(companyIdentifier) &&
                !existingCompanyNumbers.has(companyIdentifier)
              );
            }
          );

          if (invalidShareHoldings.length > 0) {
            errors.shareHoldings =
              "Invalid shareholding data - company numbers not found in uploaded data or database";
          }

          // Validate total percentage doesn't exceed 100%
          const totalPercentage = companyData.shareHoldings.reduce(
            (sum, holding) => sum + (parseFloat(holding.percentage) || 0),
            0
          );

          if (totalPercentage > 100) {
            errors.shareHoldings = "Total shareholding percentage exceeds 100%";
          }
        }

        return {
          ...companyData,
          isInvalid: Object.keys(errors).length > 0,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
        };
      });

      return sendResponse({
        status: "success",
        statusCode: 200,
        message: "Validation completed",
        payload: {
          summary: {
            totalRecords: companiesData.length,
            validRecords: validatedData.filter((company) => !company.isInvalid)
              .length,
            invalidRecords: validatedData.filter((company) => company.isInvalid)
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
  bulkUpload: async (req, res) => {
    // Start a MongoDB session for transaction support
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let userId = req.decoded._id;
      const companiesData = req.body;

      if (!Array.isArray(companiesData) || companiesData.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Invalid data format. Expected an array of companies.",
          res,
        });
      }

      // Get user's parent company and type
      const loggedInUser = await User.findById(userId).session(session);

      // Step 1: Check for unique company numbers - convert all to strings for consistent comparison
      const companyNumbers = companiesData.map((company) =>
        String(company.companyNumber)
      );
      const uniqueCompanyNumbers = new Set(companyNumbers);

      if (uniqueCompanyNumbers.size !== companyNumbers.length) {
        await session.abortTransaction();
        session.endSession();
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Duplicate company numbers found in the uploaded data.",
          res,
        });
      }

      // Check if any company numbers already exist in the database
      const existingCompanies = await Company.find({
        companyNumber: { $in: companyNumbers },
        isDeleted: false,
      })
        .select("companyNumber companyName _id")
        .session(session);

      // Create a map of existing companies by company number for quick lookup
      const existingCompaniesMap = {};
      existingCompanies.forEach((company) => {
        existingCompaniesMap[String(company.companyNumber)] = company._id;
      });
      if (existingCompanies.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Some company numbers already exist in the database.",
          payload: existingCompanies.map((c) => ({
            companyNumber: c.companyNumber,
            companyName: c.companyName,
          })),
          res,
        });
      }

      // Create a map to store created companies by their company number
      const createdCompanies = {};
      // Array to store all created company IDs
      const createdCompanyIds = [];

      // First pass: Create all companies with basic data, without resolving relationships
      for (const companyData of companiesData) {
        const newCompanyData = { ...companyData };
        // Validate basic fields (similar to your existing validation code)
        if (
          !newCompanyData.companyName ||
          (typeof newCompanyData.companyName === "string" &&
            !newCompanyData.companyName.trim())
        )
          throw new Error("Company Name is required");
        // Set parent company if not provided
        if (!newCompanyData.parentCompany) {
          newCompanyData.parentCompany = loggedInUser.parentCompany;
        } else {
          const parentCompany = await Company.findOne({
            companyNumber: newCompanyData.parentCompany,
          });
          if (parentCompany) {
            newCompanyData.parentCompany = parentCompany._id;
          } else {
            // If parent company not found, set to user's parent company
            newCompanyData.parentCompany = loggedInUser.parentCompany;
          }
        }

        // Temporarily remove shareholdings to handle them in the second pass
        const shareholdings = newCompanyData.shareHoldings;
        delete newCompanyData.shareHoldings;

        // Create the company
        const newCompany = await Company.create([newCompanyData], { session });
        createdCompanies[String(newCompanyData.companyNumber)] =
          newCompany[0]._id;
        createdCompanyIds.push(newCompany[0]._id);

        // Store the original shareholdings for later processing
        if (shareholdings && shareholdings.length > 0) {
          createdCompanies[
            `${String(newCompanyData.companyNumber)}_shareholdings`
          ] = shareholdings;
        }
      }

      // Update user with all created companies and appropriate privileges
      const userPrivileges =
        loggedInUser.type === USER_TYPES.INTERNAL
          ? privileges.admin
          : privileges.user;

      // Prepare company entries with privileges
      const companyEntries = createdCompanyIds.map((companyId) => ({
        company: companyId,
        privileges: userPrivileges,
      }));

      // Update user's companies array
      if (loggedInUser.companies && loggedInUser.companies.length > 0) {
        await User.updateOne(
          { _id: objectId(userId) },
          { $addToSet: { companies: { $each: companyEntries } } },
          { session }
        );
      } else {
        await User.updateOne(
          { _id: objectId(userId) },
          { companies: companyEntries },
          { session }
        );
      }

      // Second pass: Update parent company references
      for (const companyData of companiesData) {
        if (companyData.parentCompany) {
          const companyNumberStr = String(companyData.companyNumber);
          const parentCompanyNumberStr = String(companyData.parentCompany);

          // Check if parent company is in the newly created companies
          if (createdCompanies[parentCompanyNumberStr]) {
            await Company.updateOne(
              { _id: createdCompanies[companyNumberStr] },
              { parentCompany: createdCompanies[parentCompanyNumberStr] },
              { session }
            );
          } else if (existingCompaniesMap[parentCompanyNumberStr]) {
            // Check if it's an existing company in the database using our map
            await Company.updateOne(
              { _id: createdCompanies[companyNumberStr] },
              { parentCompany: existingCompaniesMap[parentCompanyNumberStr] },
              { session }
            );
          } else {
            const parentCompany = await Company.findOne({
              companyNumber: companyData.parentCompany,
            });
            // If parent company not found, set to user's parent company
            await Company.updateOne(
              { _id: createdCompanies[companyNumberStr] },
              { parentCompany: parentCompany._id },
              { session }
            );
          }
        }
      }

      // Third pass: Update shareholdings
      for (const companyData of companiesData) {
        const companyNumberStr = String(companyData.companyNumber);
        const shareholdings =
          createdCompanies[`${companyNumberStr}_shareholdings`];

        if (shareholdings && shareholdings.length > 0) {
          const updatedShareholdings = await Promise.all(
            shareholdings.map(async (holding) => {
              // Get company identifier (either company or companyId field)
              const companyIdentifier = String(
                holding.company || holding.companyId
              );

              // Check if the company exists in our newly created companies
              if (createdCompanies[companyIdentifier]) {
                return {
                  ...holding,
                  company: createdCompanies[companyIdentifier],
                };
              } else if (existingCompaniesMap[companyIdentifier]) {
                // Check if it's an existing company in the database
                return {
                  ...holding,
                  company: existingCompaniesMap[companyIdentifier],
                };
              } else {
                // Try to find by company number in the database
                const existingCompany = await Company.findOne({
                  companyNumber: companyIdentifier,
                  isDeleted: false,
                }).session(session);

                if (existingCompany) {
                  return {
                    ...holding,
                    company: existingCompany._id,
                  };
                }
                return holding;
              }
            })
          );

          await Company.updateOne(
            { _id: createdCompanies[companyNumberStr] },
            { shareHoldings: updatedShareholdings },
            { session }
          );
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return sendResponse({
        status: "success",
        statusCode: 200,
        message: "Companies uploaded successfully.",
        payload: {
          totalCompanies: Object.keys(createdCompanies).filter(
            (key) => !key.includes("_shareholdings")
          ).length,
        },
        res,
      });
    } catch (err) {
      // If an error occurs, abort the transaction and roll back all changes
      await session.abortTransaction();
      session.endSession();

      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: err.message,
        res,
      });
    }
  },
  userParentCompany: async (req, res) => {
    try {
      let userId = req.decoded._id;
      const userParentCompany = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany")
        .populate({
          path: "parentCompany",
          match: { isDeleted: false },
        })
        .lean();

      if (userParentCompany) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Parent company.",
          payload: userParentCompany.parentCompany,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No company found.",
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
  userCompanies: async (req, res) => {
    try {
      let userId = req.decoded._id;
      const userCompanies = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany companies -_id")
        .lean();
      const companyIds = userCompanies.companies || [];

      let companies;
      if (userCompanies.parentCompany) {
        let {
          limit = 10,
          page = 1,
          sortKey,
          sortOrder,
          searchString,
          searchKeys,
          filterData,
        } = req.query;

        // Define consistent sort parameters
        const defaultSortKey = "companyName";
        const defaultSortOrder = "asc";
        const stabilitySort = "_id";

        // Validate and sanitize sort parameters
        sortKey = sortKey || defaultSortKey;
        sortOrder =
          sortOrder === "desc" || sortOrder === "asc"
            ? sortOrder
            : defaultSortOrder;

        const pipeline = [
          {
            $match: {
              isDeleted: false,
            },
          },
        ];

        if (req.path.includes("list")) {
          pipeline.push({
            $match: {
              parentCompany: userCompanies.parentCompany,
            },
          });

          const filters = filterData && JSON.parse(filterData);
          if (filters) {
            for (let filterKey in filters) {
              if (Array.isArray(filters[filterKey])) {
                if (filters[filterKey].length) {
                  pipeline.push({
                    $match: {
                      [`${filterKey}`]: {
                        $in: filters[filterKey],
                      },
                    },
                  });
                }
              } else {
                pipeline.push({
                  $match: {
                    [filterKey]: {
                      $regex: new RegExp(
                        "^" + filters[filterKey].toLowerCase(),
                        "i"
                      ),
                    },
                  },
                });
              }
            }
          }

          pipeline.push({
            $project: {
              _id: 1,
              companyName: 1,
              companyNumber: 1,
              companyType: 1,
              parentCompany: 1,
              registeredAddress: 1,
              registeredAddressCity: 1,
              registeredAddressCountry: 1,
              registeredAddressPostalCode: 1,
              businessAddress: 1,
              businessAddressCity: 1,
              businessAddressCountry: 1,
              businessAddressPostalCode: 1,
              shareHoldings: 1,
              children: 1,
              level: 1,
              expanded: 1,
              currency: 1,
              taxRefNumber: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          });

          filterData = null;
        } else {
          pipeline.push({
            $match: {
              _id: userCompanies.parentCompany,
            },
          });
        }

        pipeline.push(
          {
            $graphLookup: {
              from: Company.collection.name,
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentCompany",
              depthField: "level",
              as: "children",
              restrictSearchWithMatch: { isDeleted: false },
            },
          },
          {
            $lookup: {
              from: Company.collection.name,
              let: { companyId: "$_id" },
              pipeline: [
                {
                  $match: {
                    isDeleted: false,
                    "shareHoldings.company": { $exists: true },
                  },
                },
                {
                  $match: {
                    $expr: {
                      $in: ["$$companyId", "$shareHoldings.company"],
                    },
                  },
                },
              ],
              as: "shareholdingParents",
            },
          },
          {
            $addFields: {
              // Add sorting fields to all children for stable sorting
              children: {
                $map: {
                  input: "$children",
                  as: "child",
                  in: {
                    $mergeObjects: [
                      "$$child",
                      {
                        // Add stability sorting fields
                        sortCompanyName: {
                          $ifNull: ["$$child.companyName", ""],
                        },
                        sortCreatedAt: {
                          $ifNull: ["$$child.createdAt", new Date(0)],
                        },
                        sortId: "$$child._id",
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              // Sort direct children
              children: {
                $sortArray: {
                  input: "$children",
                  sortBy: {
                    level: 1,
                    sortCompanyName: 1,
                    sortCreatedAt: 1,
                    sortId: 1,
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: "$_id",
              parentCompany: { $first: "$parentCompany" },
              companyName: { $first: "$companyName" },
              companyNumber: { $first: "$companyNumber" },
              registeredAddress: { $first: "$registeredAddress" },
              registeredAddressCity: { $first: "$registeredAddressCity" },
              registeredAddressCountry: { $first: "$registeredAddressCountry" },
              registeredAddressPostalCode: {
                $first: "$registeredAddressPostalCode",
              },
              businessAddress: { $first: "$businessAddress" },
              businessAddressCity: { $first: "$businessAddressCity" },
              businessAddressCountry: { $first: "$businessAddressCountry" },
              businessAddressPostalCode: {
                $first: "$businessAddressPostalCode",
              },
              currency: { $first: "$currency" },
              taxRefNumber: { $first: "$taxRefNumber" },
              shareHoldings: { $first: "$shareHoldings" },
              companyType: { $first: "$companyType" },
              shareholdingParents: { $first: "$shareholdingParents" },
              children: { $first: "$children" },
              // Capture original creation time for additional stability
              originalCreatedAt: { $first: "$createdAt" },
            },
          },
          // Recursive Children Sorting Stage
          {
            $addFields: {
              children: {
                $map: {
                  input: "$children",
                  as: "child",
                  in: {
                    $mergeObjects: [
                      "$$child",
                      {
                        // Restore full nested children structure
                        children: {
                          $filter: {
                            input: "$children",
                            as: "nestedChild",
                            cond: {
                              $eq: [
                                "$$nestedChild.parentCompany",
                                "$$child._id",
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          // Recursively sort nested children
          {
            $addFields: {
              children: {
                $map: {
                  input: "$children",
                  as: "child",
                  in: {
                    $mergeObjects: [
                      "$$child",
                      {
                        children: {
                          $sortArray: {
                            input: { $ifNull: ["$$child.children", []] },
                            sortBy: {
                              companyName: 1,
                              createdAt: 1,
                              _id: 1,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              // Clean up temporary sorting fields
              "children.sortCompanyName": 0,
              "children.sortCreatedAt": 0,
              "children.sortId": 0,
            },
          },
          {
            $addFields: {
              expanded: true,
            },
          }
        );

        if (req.path.includes("list")) {
          // Create a robust, multi-level sorting stage
          const sortStages = [
            {
              $addFields: {
                // Create a deterministic sorting key for stability
                sortValue: {
                  $ifNull: [
                    `$${sortKey}`,
                    // Fallback to a stable identifier if primary sort key is null
                    "$companyName",
                  ],
                },
              },
            },
            {
              $sort: {
                sortValue: sortOrder === "desc" ? -1 : 1,
                // Multiple fallback sorting for absolute stability
                originalCreatedAt: 1,
                [stabilitySort]: 1,
              },
            },
            {
              $project: {
                sortValue: 0, // Remove the temporary sorting field
              },
            },
          ];

          companies = await new CommonAggregation({
            Model: Company,
            pipeline: [...pipeline, ...sortStages],
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
        } else {
          pipeline.push(
            {
              $match: {
                $or: [
                  { shareHoldings: { $exists: false } },
                  { shareHoldings: { $size: 0 } },
                ],
              },
            },
            {
              $sort: {
                // Consistent sorting for chart view
                companyName: 1,
                originalCreatedAt: 1,
                _id: 1,
              },
            }
          );

          companies = await new CommonAggregation({
            Model: Company,
            pipeline,
            query: {},
          }).getAggregateWithoutPagination();
        }
      } else {
        // For users without a parent company
        companies = await Company.find({
          _id: { $in: companyIds },
          isDeleted: false,
        }).sort({
          companyName: 1,
          createdAt: 1,
          _id: 1,
        });
      }

      if (companies) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Companies.",
          payload: companies,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No company found.",
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
  userStateCompanies: async (req, res) => {
    try {
      let userId = req.decoded._id;
      let companyId = req.query.companyId;
      const userCompanies = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany companies -_id")
        .lean();

      if (!Array.isArray(userCompanies.companies)) userCompanies.companies = [];

      const pipeline = [
        {
          $match: {
            _id: { $in: userCompanies.companies.map((item) => item.company) },
            companyType: "parent",
            isDeleted: false,
          },
        },
      ];

      if (companyId) {
        pipeline.push({
          $match: {
            _id: { $ne: objectId(companyId) },
          },
        });
      }

      const companies = await new CommonAggregation({
        Model: Company,
        pipeline,
        query: {},
      }).getAggregateWithoutPagination();

      if (companies) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company list.",
          payload: companies,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No company found.",
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
  details: async (req, res) => {
    try {
      let companyId = req.params.id;
      let companyDetails = await Company.findOne({
        _id: objectId(companyId),
        isDeleted: false,
      })
        .populate("parentCompany")
        .populate({
          path: "shareHoldings.company",
        })
        .lean();

      // Remove acquisitionDate from each shareholding
      if (companyDetails && companyDetails.shareHoldings) {
        companyDetails.shareHoldings = companyDetails.shareHoldings.map(
          (holding) => {
            const { acquisitionDate, ...rest } = holding;
            return rest;
          }
        );
      }

      if (companyDetails) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company details.",
          payload: { ...companyDetails },
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Company not found.",
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
  update: async (req, res) => {
    try {
      let companyId = req.params.id;
      let companyDetails = { ...req.body };
      const updatedCompany = await Company.updateOne(
        { _id: companyId },
        { ...companyDetails }
      );

      if (updatedCompany) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company details updated successfully.",
          payload: updatedCompany,
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
      let companyId = req.params.id;

      // Start a session first before any operations
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          // Get company details to check if it's a parent company
          const company = await Company.findById(companyId).session(session);

          if (!company) {
            throw new Error("Company not found");
          }

          if (company.companyType === "main") {
            throw new Error("Cannot delete main company.");
          }

          // Delete the company and all its children
          const deleteOperations = [
            // Delete the main company
            Company.deleteOne({ _id: companyId }).session(session),

            // Delete all child companies
            Company.deleteMany({ parentCompany: companyId }).session(session),

            CompanyDocument.deleteMany({ company: companyId }).session(session),

            // Remove company references from users
            User.updateMany(
              { "companies.company": companyId },
              { $pull: { companies: { company: companyId } } }
            ).session(session),

            // Remove parent company references
            User.updateMany(
              { parentCompany: companyId },
              { $unset: { parentCompany: "" } }
            ).session(session),
          ];

          // Execute all delete operations
          await Promise.all(deleteOperations);
        });

        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Company and associated data deleted successfully.",
          res,
        });
      } finally {
        // End session
        session.endSession();
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

export default company;
