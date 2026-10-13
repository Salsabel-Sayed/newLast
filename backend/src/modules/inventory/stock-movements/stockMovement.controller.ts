import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as stockMovementService from "./stockMovement.service.js";

export const listStockMovements = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    rawMaterialId?: string;
    batchId?: string;
    returnedMixBatchId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    movementType?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await stockMovementService.listStockMovements({
    rawMaterialId: query.rawMaterialId,
    batchId: query.batchId,
    returnedMixBatchId: query.returnedMixBatchId,
    relatedEntityType: query.relatedEntityType,
    relatedEntityId: query.relatedEntityId,
    movementType: query.movementType,
    page,
    limit,
  });

  sendSuccess(res, result);
});
