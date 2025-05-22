import { Router } from "express";
const formBuilderRouter = Router();

import formBuilder from "../controllers/formBuilder.controller.js";

formBuilderRouter.get("/company/:companyId", formBuilder.getByCompanyId);
formBuilderRouter.get("", formBuilder.get);
formBuilderRouter.get("/:id", formBuilder.details);
formBuilderRouter.put("/:id", formBuilder.update);
formBuilderRouter.put("/field/delete/:id", formBuilder.delete);
formBuilderRouter.put("/field/delete-child/:id", formBuilder.deleteChild);

export default formBuilderRouter;
