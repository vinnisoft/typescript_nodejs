import { FORM_TYPES } from "./enums/formBuilder.enums";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fieldSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "text",
      "number",
      "date",
      "doc",
      "boolean",
      "dropdown",
      "multiSelect",
      "email",
      "phone",
      "parent",
    ],
    required: true,
    default: "text",
  },
  capitalize: {
    type: Boolean,
    default: false,
  },
  options: [],
  children: {
    type: [
      {
        name: {
          type: String,
          required: true,
        },
        field: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: [
            "text",
            "number",
            "date",
            "doc",
            "boolean",
            "dropdown",
            "multiSelect",
            "email",
            "phone",
            "parent",
          ],
          required: true,
          default: "text",
        },
        capitalize: {
          type: Boolean,
          default: false,
        },
        sortable: {
          type: Boolean,
          default: false,
        },
        filter: {
          type: Boolean,
          default: false,
        },
        expandable: {
          type: Boolean,
          default: false,
        },
        filterType: {
          type: String,
          enum: ["text", "dropdown", "dropdown", "multiSelect", "date"],
          required: true,
          default: "text",
        },
        isRequired: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    default: null,
  },
  childPrefix: {
    type: String,
    default: null,
  },
  sortable: {
    type: Boolean,
    default: false,
  },
  filter: {
    type: Boolean,
    default: false,
  },
  expandable: {
    type: Boolean,
    default: false,
  },
  filterType: {
    type: String,
    enum: ["text", "dropdown", "dropdown", "multiSelect", "date"],
    required: true,
    default: "text",
  },
  isRequired: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const formBuilderSchema = new Schema(
  {
    formName: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    formType: {
      type: String,
      enum: Object.values(FORM_TYPES),
      default: FORM_TYPES.COPMANY,
    },
    fields: [fieldSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// if (mongoose.models.FormBuilder) {
//   delete mongoose.models.FormBuilder;
// }

const FormBuilder =
  mongoose.models.FormBuilder ||
  mongoose.model("FormBuilder", formBuilderSchema);
export default FormBuilder;
