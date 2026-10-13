import { Types } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { applyAbsoluteCorrection } from "../batches/batch.service.js";
import { recordStockMovement } from "../stock-movements/stockMovement.service.js";
import { StockCorrectionModel } from "./stockCorrection.model.js";

export interface CreateStockCorrectionInput {
  batchId: string;
  quantityAfterKg: number;
  reason: string;
  correctionDate: Date;
  notes?: string;
}

export async function createStockCorrection(input: CreateStockCorrectionInput) {
  return withTransaction(async (session) => {
    const batchIdObjectId = new Types.ObjectId(input.batchId);

    const result = await applyAbsoluteCorrection(
      batchIdObjectId,
      input.quantityAfterKg,
      session
    );

    const differenceKg = result.after - result.before;
    const correctionId = new Types.ObjectId();

    if (Math.abs(differenceKg) > 0) {
      await recordStockMovement(
        {
          rawMaterialId: result.rawMaterialId,
          batchId: batchIdObjectId,
          quantityKg: Math.abs(differenceKg),
          direction: differenceKg > 0 ? "in" : "out",
          movementType:
            differenceKg > 0 ? "stock_correction_increase" : "stock_correction_decrease",
          relatedEntityType: "StockCorrection",
          relatedEntityId: correctionId,
        },
        session
      );
    }

    const correctionNumber = await getNextSequenceNumber("SC", { session });

    const [correction] = await StockCorrectionModel.create(
      [
        {
          _id: correctionId,
          correctionNumber,
          batchId: batchIdObjectId,
          batchCode: result.batchCode,
          rawMaterialId: result.rawMaterialId,
          rawMaterialName: result.rawMaterialName,
          rawMaterialCode: result.rawMaterialCode,
          quantityBeforeKg: result.before,
          quantityAfterKg: result.after,
          differenceKg,
          reason: input.reason,
          correctionDate: input.correctionDate,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ],
      { session }
    );

    return correction;
  });
}

export async function getStockCorrectionById(id: string) {
  const correction = await StockCorrectionModel.findById(id);
  if (!correction) {
    throw new AppError("سجل تصحيح المخزون غير موجود", 404);
  }
  return correction;
}

interface ListStockCorrectionsOptions {
  batchId?: string | undefined;
  rawMaterialId?: string | undefined;
  page: number;
  limit: number;
}

export async function listStockCorrections(options: ListStockCorrectionsOptions) {
  const filter: Record<string, unknown> = {};
  if (options.batchId) filter.batchId = options.batchId;
  if (options.rawMaterialId) filter.rawMaterialId = options.rawMaterialId;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    StockCorrectionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    StockCorrectionModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
