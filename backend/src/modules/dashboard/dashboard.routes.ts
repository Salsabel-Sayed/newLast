import { Router } from "express";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get("/summary", dashboardController.getSummary);

export const dashboardRouter = router;
