import type { Request, Response } from "express";
import { catchError } from "../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";
import { getDashboardSummary } from "./dashboard.service.js";

export const getSummary = catchError(async (_req: Request, res: Response) => {
  const summary = await getDashboardSummary();
  sendSuccess(res, summary);
});
