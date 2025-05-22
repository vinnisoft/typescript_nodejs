import { Router } from "express";
const companyRouter = Router();

import company from "../controllers/company.controller.js";

companyRouter.post("/add", company.add);
companyRouter.post(
  "/validate-bulk-upload",
  company.validateBulkCompaniesUpload
);
companyRouter.post("/bulk-upload", company.bulkUpload);
companyRouter.get("/form-fields", company.formFields);
companyRouter.get("/user-companies", company.userCompanies);
companyRouter.get("/parent-company", company.userParentCompany);
companyRouter.get("/user-companies-list", company.userCompanies);
companyRouter.get("/state-companies", company.userStateCompanies);
companyRouter.get("/details/:id", company.details);
companyRouter.put("/update/:id", company.update);
companyRouter.delete("/delete/:id", company.delete);

export default companyRouter;
