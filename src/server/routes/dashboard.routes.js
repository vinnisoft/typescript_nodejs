import { Router } from "express";
const dashboardRouter = Router();

import dashbaord from "../controllers/dashboard.controller";

dashboardRouter.get("/analytics", dashbaord.analytics);

export default dashboardRouter;
