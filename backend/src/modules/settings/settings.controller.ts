import type { Request, Response } from "express";
import { catchError } from "../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";
import * as settingsService from "./settings.service.js";

export const getSettings = catchError(async (_req: Request, res: Response) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, settings);
});

export const updateSettings = catchError(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.body);
  sendSuccess(res, settings);
});

export const resetDatabase = catchError(async (_req: Request, res: Response) => {
  await settingsService.fullDatabaseReset();
  sendSuccess(res, { reset: "database" });
});

export const resetTransactions = catchError(async (_req: Request, res: Response) => {
  await settingsService.transactionsReset();
  sendSuccess(res, { reset: "transactions" });
});

export const resetNumberSequences = catchError(async (_req: Request, res: Response) => {
  await settingsService.resetNumberSequences();
  sendSuccess(res, { reset: "number-sequences" });
});
