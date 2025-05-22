const jwt = require("jsonwebtoken");
import User from "../models/users.mongo";
import Company from "../models/company.mongo";
import { USER_ROLES } from "../models/enums/user.enums";
import sendResponse from "../services/response";

async function isCompanyAdmin(req, res, next) {
  let token = req.get("authorization");
  if (token) {
    token = token.slice(7);
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log(err.message);
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "Invalid token!",
          res,
        });
      } else {
        if (decoded.role === USER_ROLES.ADMIN) {
          if (decoded._id) {
            // Check if user exists and is not deleted
            const user = await User.findOne({
              _id: decoded._id,
              isDeleted: false,
              isActive: true
            });
            
            if (!user) {
              return sendResponse({
                status: "fail",
                statusCode: 401,
                message: "User not found or inactive!",
                res,
              });
            }
            
            // Check if parent company exists and is not deleted
            if (user.parentCompany) {
              const company = await Company.findOne({
                _id: user.parentCompany,
                isDeleted: false
              });
              
              if (!company) {
                return sendResponse({
                  status: "fail",
                  statusCode: 401,
                  message: "Company has been deleted or is inactive!",
                  res,
                });
              }
              
              // Check storage space and add warning if needed - only for main company
              if (company.companyType === 'main' && company.shouldShowStorageWarning()) {
                req.storageWarning = company.getStorageWarningMessage();
              }
              
              // If storage is completely full, restrict certain operations - only for main company
              if (company.companyType === 'main' && company.storageQuota > 0 && company.storageUsed >= company.storageQuota) {
                req.storageExceeded = true;
              }
            }
            
            req.decoded = { _id: decoded._id, role: decoded.role };
            next();
          } else {
            return sendResponse({
              status: "fail",
              statusCode: 401,
              message: "Unauthorized User!",
              res,
            });
          }
        } else {
          return sendResponse({
            status: "fail",
            statusCode: 401,
            message: "Unauthorized User!",
            res,
          });
        }
      }
    });
  } else {
    return sendResponse({
      status: "fail",
      statusCode: 401,
      message: "Unauthorized Access!",
      res,
    });
  }
}

async function isUser(req, res, next) {
  let token = req.get("authorization");
  if (token) {
    token = token.slice(7);
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log(err.message);
        return sendResponse({
          status: "fail",
          statusCode: 401,
          message: "Invalid token!",
          res,
        });
      } else {
        if (decoded._id) {
          // Check if user exists and is not deleted
          const user = await User.findOne({
            _id: decoded._id,
            isDeleted: false,
            isActive: true
          });
          
          if (!user) {
            return sendResponse({
              status: "fail",
              statusCode: 401,
              message: "User not found or inactive!",
              res,
            });
          }
          
          // Check if parent company exists and is not deleted
          if (user.parentCompany) {
            const company = await Company.findOne({
              _id: user.parentCompany,
              isDeleted: false
            });
            
            if (!company) {
              return sendResponse({
                status: "fail",
                statusCode: 401,
                message: "Company has been deleted or is inactive!",
                res,
              });
            }
            
            // Only check storage for admin users of main company
            if (decoded.role === USER_ROLES.ADMIN && company.companyType === 'main') {
              // Check storage space and add warning if needed
              if (company.shouldShowStorageWarning()) {
                req.storageWarning = company.getStorageWarningMessage();
              }
              
              // If storage is completely full, restrict certain operations
              if (company.storageQuota > 0 && company.storageUsed >= company.storageQuota) {
                req.storageExceeded = true;
              }
            }
          }
          
          req.decoded = { _id: decoded._id, role: decoded.role };
          next();
        } else {
          return sendResponse({
            status: "fail",
            statusCode: 401,
            message: "Unauthorized User!",
            res,
          });
        }
      }
    });
  } else {
    return sendResponse({
      status: "fail",
      statusCode: 401,
      message: "Unauthorized Access!",
      res,
    });
  }
}

// Middleware to check if storage is exceeded before allowing file uploads
async function checkStorageAvailable(req, res, next) {
  if (req.storageExceeded) {
    return sendResponse({
      status: "fail",
      statusCode: 403,
      message: "Storage quota exceeded. Please upgrade your plan or free up space.",
      res,
    });
  }
  next();
}

export { isUser, isCompanyAdmin, checkStorageAvailable };
