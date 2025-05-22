const mongoose = require("mongoose");
import Company from "../models/company.mongo";
import { COMPANY_TYPES } from "../models/enums/company.enums";
import User from "../models/users.mongo";
import { USER_ROLES, USER_TYPES } from "../models/enums/user.enums";
import sendResponse from "../services/response";
const objectId = mongoose.Types.ObjectId.createFromHexString;

const dashbaord = {
  analytics: async (req, res) => {
    try {
      const userId = req.decoded._id;
      const user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany")
        .populate({ path: "parentCompany", select: "companyName" })
        .lean();

      const parentCompanies = await Company.find({
        isDeleted: false,
        parentCompany: user.parentCompany._id,
        companyType: COMPANY_TYPES.PARENT,
      })
        .select("_id companyName")
        .lean();

      const parentIds = parentCompanies.map((pc) => pc._id);

      const subsidiaryCountsByParent = await Company.aggregate([
        {
          $match: {
            isDeleted: false,
            _id: { $in: parentIds },
          },
        },
        {
          $graphLookup: {
            from: Company.collection.name,
            startWith: ["$_id"],
            connectFromField: "_id",
            connectToField: "parentCompany",
            as: "subsidiariesByParent",
            restrictSearchWithMatch: {
              isDeleted: false,
              companyType: COMPANY_TYPES.SUBSIDIARY,
            },
          },
        },
        {
          $graphLookup: {
            from: Company.collection.name,
            startWith: ["$_id"],
            connectFromField: "_id",
            connectToField: "shareHoldings.company",
            as: "subsidiariesByShareholdings",
            restrictSearchWithMatch: {
              isDeleted: false,
              companyType: COMPANY_TYPES.SUBSIDIARY,
            },
          },
        },
        {
          $project: {
            companyName: 1,
            allSubsidiaries: {
              $setUnion: [
                "$subsidiariesByParent._id",
                "$subsidiariesByShareholdings._id",
              ],
            },
          },
        },
        {
          $project: {
            companyName: 1,
            subsidiaryCount: { $size: "$allSubsidiaries" },
          },
        },
      ]);

      // Map counts to company names
      const subsidiaryCountsMap = {};

      parentCompanies.forEach((pc) => {
        const found = subsidiaryCountsByParent.find(
          (s) =>
            String(s._id) === String(pc._id) || s.companyName === pc.companyName
        );
        subsidiaryCountsMap[pc.companyName] = found ? found.subsidiaryCount : 0;
      });

      const [
        totalUsers = 0,
        internalUsers = 0,
        externalUsers = 0,
        systemAccountants = 0,
      ] = await Promise.all([
        User.countDocuments({
          isDeleted: false,
          role: { $ne: USER_ROLES.ADMIN },
          parentCompany: user.parentCompany._id,
        }),
        User.countDocuments({
          isDeleted: false,
          parentCompany: user.parentCompany._id,
          role: USER_ROLES.USER,
          type: USER_TYPES.INTERNAL,
        }),
        User.countDocuments({
          isDeleted: false,
          parentCompany: user.parentCompany._id,
          role: USER_ROLES.USER,
          type: USER_TYPES.EXTERNAL,
        }),
        User.countDocuments({
          isDeleted: false,
          parentCompany: user.parentCompany._id,
          role: USER_ROLES.SYSTEM_ACCOUNTANT,
        }),
      ]);

      // Fetch all companies (parent + subsidiaries) with _id and companyName
      const allCompanies = await Company.find({
        isDeleted: false,
        parentCompany: user.parentCompany._id,
      })
        .select("_id companyName companyType")
        .lean();

      // Calculate percentages (out of 100)
      const internalPercentage =
        totalUsers > 0
          ? parseFloat(((internalUsers / totalUsers) * 100).toFixed(2))
          : 0;
      const externalPercentage =
        totalUsers > 0
          ? parseFloat(((externalUsers / totalUsers) * 100).toFixed(2))
          : 0;
      const systemAccountantPercentage =
        totalUsers > 0
          ? parseFloat(((systemAccountants / totalUsers) * 100).toFixed(2))
          : 0;

      const totalSubsidiaryCompanies = subsidiaryCountsByParent.reduce(
        (total, company) => total + company.subsidiaryCount,
        0
      );
      const totalParentCompanies = parentCompanies.length;
      const totalCompanies = totalParentCompanies + totalSubsidiaryCompanies;

      return sendResponse({
        status: "success",
        statusCode: 200,
        payload: {
          companyName: user.parentCompany.companyName,
          totalCompanies,
          totalParentCompanies,
          totalSubsidiaryCompanies,
          subsidiaryCountsByParent: subsidiaryCountsMap,
          allCompanies, // <-- Add this line
          users: {
            totalUsers,
            byType: {
              internal: {
                count: internalUsers,
                percentage: internalPercentage,
              },
              external: {
                count: externalUsers,
                percentage: externalPercentage,
              },
              systemAccountant: {
                count: systemAccountants,
                percentage: systemAccountantPercentage,
              },
            },
          },
        },
        message: "Dashboard analytics retrieved successfully",
        res,
      });
    } catch (error) {
      return sendResponse({
        status: "fail",
        statusCode: 500,
        message: error.message,
        res,
      });
    }
  },
};

export default dashbaord;
