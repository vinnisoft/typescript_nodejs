const mongoose = require("mongoose");
import { generateRandomColor } from "../../app/shared/utils/misc";
import { USER_ROLES } from "../models/enums/user.enums";
import FormBuilder from "../models/formBuilder.mongo";
import User from "../models/users.mongo";
import CommonAggregation from "../services/AggregateWithPagination";
import sendResponse from "../services/response";
import { privileges } from "../services/utilities";
const objectId = mongoose.Types.ObjectId.createFromHexString;

const formBuilder = {
  get: async (req, res) => {
    try {
      let userId = req.decoded._id;
      const user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany role")
        .lean();

      const pipeline = [
        {
          $match: {
            companyId: user.parentCompany,
            isActive: true,
          },
        },
        {
          $sort: {
            order: 1,
          },
        },
        {
          $project: {
            _id: 1,
            formType: 1,
            formName: 1,
          },
        },
      ];

      let formBuilder = await new CommonAggregation({
        Model: FormBuilder,
        pipeline,
        query: {},
      }).getAggregateWithoutPagination();
      // Add canManage property based on user privileges

      if (formBuilder && formBuilder.length > 0) {
        formBuilder.map((form) => {
          form.color = generateRandomColor();
          return form;
        });
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Form builder.",
          payload: formBuilder,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No form found.",
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
  getByCompanyId: async (req, res) => {
    try {
      let userId = req.decoded._id;

      let { companyId } = req.params;
      let user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      });

      let userPrivileges;
      if (user.role === USER_ROLES.ADMIN) {
        userPrivileges = privileges.admin;
      } else {
        user = await User.findOne({
          _id: objectId(userId),
          companies: { $elemMatch: { company: objectId(companyId) } },
          isVerified: true,
          isDeleted: false,
        }).select({
          role: 1,
          "companies.$": 1,
          parentCompany: 1,
        });

        if (user) {
          userPrivileges = { ...user.companies[0]?.privileges } || {};
        }
      }

      const pipeline = [
        {
          $match: {
            companyId: user.parentCompany,
            isActive: true,
          },
        },
        {
          $sort: {
            order: 1,
          },
        },
        {
          $project: {
            _id: 1,
            formType: 1,
            formName: 1,
          },
        },
      ];

      let formBuilder = await new CommonAggregation({
        Model: FormBuilder,
        pipeline,
        query: {},
      }).getAggregateWithoutPagination();

      // Add canManage property based on user privileges
      if (formBuilder && formBuilder.length > 0) {
        formBuilder = formBuilder.filter((form) => {
          // Always include company-data form type
          if (form.formType === "company-data") {
            form.canManage = true;
            return true;
          }

          // For other form types, check privileges
          if (userPrivileges) {
            const formPrivilege = userPrivileges[form.formType];
            if (!formPrivilege || formPrivilege.read !== true) {
              return false;
            }
            form.canManage = formPrivilege.manage === true;
            return true;
          }
          return false;
        });
      }
      if (formBuilder && formBuilder.length > 0) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Form builder.",
          payload: formBuilder,
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No form found.",
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
      let id = req.params.id;
      let userId = req.decoded._id;
      const user = await User.findOne({
        _id: objectId(userId),
        isVerified: true,
        isDeleted: false,
      })
        .select("parentCompany")
        .lean();

      const pipeline = [
        {
          $match: {
            _id: objectId(id),
            companyId: user.parentCompany,
            isActive: true,
          },
        },
        {
          $project: {
            formName: 1,
            formType: 1,
            fields: {
              $map: {
                input: {
                  $sortArray: {
                    input: "$fields",
                    sortBy: { order: 1 },
                  },
                },
                as: "field",
                in: {
                  $mergeObjects: [
                    "$$field",
                    {
                      children: {
                        $cond: {
                          if: { $isArray: "$$field.children" },
                          then: {
                            $sortArray: {
                              input: "$$field.children",
                              sortBy: { order: 1 },
                            },
                          },
                          else: "$$field.children",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ];
      let formBuilder = await new CommonAggregation({
        Model: FormBuilder,
        pipeline,
        query: {},
      }).getAggregateWithoutPagination();

      if (formBuilder) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Form details.",
          payload: formBuilder[0],
          res,
        });
      } else {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "No form found.",
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
      let id = req.params.id;
      let formBuilderDetails = { ...req.body };

      // Get current form details
      const currentForm = await FormBuilder.findById(id);
      if (!currentForm) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Form not found",
          res,
        });
      }

      // Check regular fields length
      const currentRegularFields = currentForm.fields.filter(
        (field) => field.type !== "parent"
      );
      const newRegularFields = formBuilderDetails.fields.filter(
        (field) => field.type !== "parent"
      );

      if (newRegularFields.length < currentRegularFields.length) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Cannot remove regular fields",
          res,
        });
      }

      // Check parent fields children length
      const currentParentFields = currentForm.fields.filter(
        (field) => field.type === "parent"
      );
      const newParentFields = formBuilderDetails.fields.filter(
        (field) => field.type === "parent"
      );

      for (const currentParent of currentParentFields) {
        const newParent = newParentFields.find(
          (p) => p._id.toString() === currentParent._id.toString()
        );
        if (
          newParent &&
          newParent.children.length < currentParent.children.length
        ) {
          return sendResponse({
            status: "fail",
            statusCode: 400,
            message: `Cannot remove fields from section: ${currentParent.name}`,
            res,
          });
        }
      }

      // If all checks pass, update the form
      const updatedFormbuilder = await FormBuilder.updateOne(
        { _id: id },
        { ...formBuilderDetails }
      );

      if (updatedFormbuilder) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Form details updated successfully.",
          payload: updatedFormbuilder,
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
  delete: async (req, res) => {
    try {
      let id = req.params.id;
      let fieldId = req.body.fieldId;

      const currentForm = await FormBuilder.findById(id);
      if (!currentForm) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Form not found",
          res,
        });
      }

      // Find the field to delete
      const fieldToDelete = currentForm.fields.find(
        (field) => field._id.toString() === fieldId
      );

      if (!fieldToDelete) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Field not found",
          res,
        });
      }

      // Check if field is default or required
      if (fieldToDelete.isDefault) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Cannot delete default or required field",
          res,
        });
      }

      const deletedFieldOrder = fieldToDelete.order;

      // Remove the field and update orders in one operation
      const updatedFields = currentForm.fields
        .filter((field) => field._id.toString() !== fieldId)
        .map((field) => {
          if (field.order > deletedFieldOrder) {
            field.order = field.order - 1;
          }
          return field;
        });

      // Update the entire fields array
      const updatedFormbuilder = await FormBuilder.findByIdAndUpdate(
        id,
        { $set: { fields: updatedFields } },
        { new: true }
      );

      if (updatedFormbuilder) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "Field deleted successfully",
          payload: updatedFormbuilder,
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
  deleteChild: async (req, res) => {
    try {
      let id = req.params.id;
      let { fieldId, childId } = req.body;
      // Get current form details
      const currentForm = await FormBuilder.findById(id);
      if (!currentForm) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Form not found",
          res,
        });
      }

      // Find the parent field
      const parentField = currentForm.fields.find(
        (field) => field._id.toString() === fieldId
      );

      if (!parentField || parentField.type !== "parent") {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Parent field not found",
          res,
        });
      }

      // Find the child field to delete
      const childToDelete = parentField.children.find(
        (child) => child._id.toString() === childId
      );

      if (!childToDelete) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Child field not found",
          res,
        });
      }
      // Check if child field is default or required
      if (childToDelete.isDefault) {
        return sendResponse({
          status: "fail",
          statusCode: 400,
          message: "Cannot delete default or required field",
          res,
        });
      }

      const deletedChildOrder = childToDelete.order;

      // Create updated fields array with the child removed and orders adjusted
      const updatedFields = currentForm.fields.map((field) => {
        if (field._id.toString() === fieldId) {
          // Filter out the child to delete and update orders
          const updatedChildren = field.children
            .filter((child) => child._id.toString() !== childId)
            .map((child) => {
              if (child.order > deletedChildOrder) {
                child.order = child.order - 1;
              }
              return child;
            });

          return { ...field.toObject(), children: updatedChildren };
        }
        return field;
      });

      // Update the form with the modified fields
      const updatedFormbuilder = await FormBuilder.findByIdAndUpdate(
        id,
        { $set: { fields: updatedFields } },
        { new: true }
      );

      if (updatedFormbuilder) {
        return sendResponse({
          status: "success",
          statusCode: 200,
          message: "",
          payload: updatedFormbuilder,
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
};

export default formBuilder;
