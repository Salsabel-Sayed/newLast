import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as batchService from "./batch.service.js";

export const listBatches = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    rawMaterialId?: string;
    status?: string;
    supplierId?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await batchService.listBatches({
    rawMaterialId: query.rawMaterialId,
    status: query.status,
    supplierId: query.supplierId,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getBatch = catchError(async (req: Request, res: Response) => {
  const batch = await batchService.getBatchById(getIdParam(req));
  sendSuccess(res, batch);
});

export const updateBatch = catchError(async (req: Request, res: Response) => {
  const batch = await batchService.updateBatchNotes(getIdParam(req), req.body.notes);
  sendSuccess(res, batch);
});
