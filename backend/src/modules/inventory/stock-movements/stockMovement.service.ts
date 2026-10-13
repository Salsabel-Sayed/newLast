import type { ClientSession, Types } from "mongoose";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import {
  StockMovementModel,
  type StockMovementDirection,
  type StockMovementType,
} from "./stockMovement.model.js";

export interface RecordStockMovementInput {
  rawMaterialId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  returnedMixBatchId?: Types.ObjectId;
  quantityKg: number;
  direction: StockMovementDirection;
  movementType: StockMovementType;
  relatedEntityType: string;
  relatedEntityId: Types.ObjectId;
  notes?: string;
}

export async function recordStockMovement(
  input: RecordStockMovementInput,
  session: ClientSession
) {
  const [movement] = await StockMovementModel.create([input], { session });
  return movement;
}

interface ListStockMovementsOptions {
  rawMaterialId?: string | undefined;
  batchId?: string | undefined;
  returnedMixBatchId?: string | undefined;
  relatedEntityType?: string | undefined;
  relatedEntityId?: string | undefined;
  movementType?: string | undefined;
  page: number;
  limit: number;
}

export async function listStockMovements(options: ListStockMovementsOptions) {
  const filter: Record<string, unknown> = {};

  if (options.rawMaterialId) filter.rawMaterialId = options.rawMaterialId;
  if (options.batchId) filter.batchId = options.batchId;
  if (options.returnedMixBatchId) filter.returnedMixBatchId = options.returnedMixBatchId;
  if (options.relatedEntityType) filter.relatedEntityType = options.relatedEntityType;
  if (options.relatedEntityId) filter.relatedEntityId = options.relatedEntityId;
  if (options.movementType) filter.movementType = options.movementType;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    StockMovementModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    StockMovementModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
