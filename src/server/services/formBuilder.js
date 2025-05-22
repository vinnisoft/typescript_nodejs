// In your company creation service
import { camelCaseToHeading } from "../../app/shared/utils/misc.js";
import { FORM_TYPES } from "../models/enums/formBuilder.enums.js";
import FormBuilder from "../models/formBuilder.mongo.js";
import { defaultFormFields } from "./utilities.js";

export async function createDefaultFormsForCompany(companyId, userId) {
  const formPromises = Object.values(FORM_TYPES).map((formTypeValue, index) => {
    return new FormBuilder({
      formName: camelCaseToHeading(formTypeValue),
      companyId: companyId,
      formType: formTypeValue,
      fields: defaultFormFields[formTypeValue] || [],
      createdBy: userId,
      updatedBy: userId,
      order: index + 1,
    }).save();
  });

  return Promise.all(formPromises);
}
