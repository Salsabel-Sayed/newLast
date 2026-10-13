import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as openingBalanceService from "./openingBalance.service.js";

export const listOpeningBalances = catchError(async (req: Request, res: Response) => {
  const query = req.query as { status?: string; page?: string; limit?: string };
  const { page, limit } = parsePagination(query);

  const result = await openingBalanceService.listOpeningBalances({
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getOpeningBalance = catchError(async (req: Request, res: Response) => {
  const openingBalance = await openingBalanceService.getOpeningBalanceById(
    getIdParam(req)
  );
  sendSuccess(res, openingBalance);
});

export const createOpeningBalance = catchError(async (req: Request, res: Response) => {
  const openingBalance = await openingBalanceService.createOpeningBalance(req.body);
  sendSuccess(res, openingBalance, 201);
});

export const postOpeningBalance = catchError(async (req: Request, res: Response) => {
  const openingBalance = await openingBalanceService.postOpeningBalance(getIdParam(req));
  sendSuccess(res, openingBalance);
});
