import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as stockCorrectionService from "./stockCorrection.service.js";

export const listStockCorrections = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    batchId?: string;
    rawMaterialId?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await stockCorrectionService.listStockCorrections({
    batchId: query.batchId,
    rawMaterialId: query.rawMaterialId,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getStockCorrection = catchError(async (req: Request, res: Response) => {
  const correction = await stockCorrectionService.getStockCorrectionById(getIdParam(req));
  sendSuccess(res, correction);
});

export const createStockCorrection = catchError(async (req: Request, res: Response) => {
  const correction = await stockCorrectionService.createStockCorrection(req.body);
  sendSuccess(res, correction, 201);
});
