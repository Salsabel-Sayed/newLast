import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as returnedMixBatchService from "./returnedMixBatch.service.js";

export const listReturnedMixBatches = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    recipeId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await returnedMixBatchService.listReturnedMixBatches({
    recipeId: query.recipeId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getReturnedMixBatch = catchError(async (req: Request, res: Response) => {
  const batch = await returnedMixBatchService.getReturnedMixBatchById(getIdParam(req));
  sendSuccess(res, batch);
});

export const convertReturnedMixToLoss = catchError(async (req: Request, res: Response) => {
  const batch = await returnedMixBatchService.convertReturnedMixToLoss(
    getIdParam(req),
    req.body.quantityKg
  );
  sendSuccess(res, batch);
});
