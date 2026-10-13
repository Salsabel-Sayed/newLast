import type { ClientSession } from "mongoose";
import { Types } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { recordStockMovement } from "../stock-movements/stockMovement.service.js";
import type { StockMovementType } from "../stock-movements/stockMovement.model.js";
import { BatchModel, type BatchSource } from "./batch.model.js";

export interface CreateBatchInput {
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  supplierId?: Types.ObjectId;
  source: BatchSource;
  quantityKg: number;
  unitCostPerKg: number;
  purchaseDate: Date;
  productionDate?: Date;
  purchaseOrderId?: Types.ObjectId;
  sourceReturnId?: Types.ObjectId;
  movementType: StockMovementType;
  relatedEntityType: string;
  relatedEntityId: Types.ObjectId;
}

export async function createBatch(input: CreateBatchInput, session: ClientSession) {
  const batchCode = await getNextSequenceNumber("BAT", { session });

  const [batch] = await BatchModel.create(
    [
      {
        batchCode,
        rawMaterialId: input.rawMaterialId,
        rawMaterialName: input.rawMaterialName,
        rawMaterialCode: input.rawMaterialCode,
        ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        source: input.source,
        originalQty: input.quantityKg,
        remainingQty: input.quantityKg,
        reservedQty: 0,
        unitCostPerKg: input.unitCostPerKg,
        ...(input.productionDate ? { productionDate: input.productionDate } : {}),
        purchaseDate: input.purchaseDate,
        ...(input.purchaseOrderId ? { purchaseOrderId: input.purchaseOrderId } : {}),
        ...(input.sourceReturnId ? { sourceReturnId: input.sourceReturnId } : {}),
        status: "active",
      },
    ],
    { session }
  );

  if (!batch) {
    throw new AppError("تعذر إنشاء الدفعة", 500);
  }

  await recordStockMovement(
    {
      rawMaterialId: input.rawMaterialId,
      batchId: batch._id,
      quantityKg: input.quantityKg,
      direction: "in",
      movementType: input.movementType,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    },
    session
  );

  return batch;
}

export interface BatchAllocation {
  batchId: Types.ObjectId;
  rawMaterialId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

const QUANTITY_EPSILON = 1e-9;

export async function allocateFifo(
  rawMaterialId: Types.ObjectId,
  quantityKg: number,
  session: ClientSession
): Promise<BatchAllocation[]> {
  if (quantityKg <= 0) {
    throw new AppError("الكمية المطلوبة يجب أن تكون أكبر من صفر", 400);
  }

  const batches = await BatchModel.find({ rawMaterialId, status: "active" })
    .sort({ purchaseDate: 1, _id: 1 })
    .session(session);

  const allocations: BatchAllocation[] = [];
  let remaining = quantityKg;

  for (const batch of batches) {
    if (remaining <= QUANTITY_EPSILON) break;

    const available = batch.remainingQty - batch.reservedQty;
    if (available <= QUANTITY_EPSILON) continue;

    const take = Math.min(available, remaining);
    allocations.push({
      batchId: batch._id,
      rawMaterialId: batch.rawMaterialId,
      quantityKg: take,
      unitCostPerKg: batch.unitCostPerKg,
    });
    remaining -= take;
  }

  if (remaining > QUANTITY_EPSILON) {
    throw new AppError("الكمية المتاحة من المادة الخام غير كافية", 409);
  }

  return allocations;
}

interface AllocationContext {
  movementType: StockMovementType;
  relatedEntityType: string;
  relatedEntityId: Types.ObjectId;
}

export async function reserveAllocations(
  allocations: BatchAllocation[],
  context: AllocationContext,
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await BatchModel.updateOne(
      {
        _id: allocation.batchId,
        $expr: {
          $gte: [
            { $subtract: ["$remainingQty", "$reservedQty"] },
            allocation.quantityKg,
          ],
        },
      },
      { $inc: { reservedQty: allocation.quantityKg } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError("تعذر حجز الكمية المطلوبة، الرصيد المتاح تغيّر", 409);
    }

    await recordStockMovement(
      {
        rawMaterialId: allocation.rawMaterialId,
        batchId: allocation.batchId,
        quantityKg: allocation.quantityKg,
        direction: "reserve",
        movementType: context.movementType,
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
      },
      session
    );
  }
}

export async function releaseAllocations(
  allocations: BatchAllocation[],
  context: AllocationContext,
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await BatchModel.updateOne(
      { _id: allocation.batchId, reservedQty: { $gte: allocation.quantityKg } },
      { $inc: { reservedQty: -allocation.quantityKg } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError("تعذر إلغاء حجز الكمية المطلوبة", 409);
    }

    await recordStockMovement(
      {
        rawMaterialId: allocation.rawMaterialId,
        batchId: allocation.batchId,
        quantityKg: allocation.quantityKg,
        direction: "release",
        movementType: context.movementType,
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
      },
      session
    );
  }
}

export async function issueAllocations(
  allocations: BatchAllocation[],
  context: AllocationContext,
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await BatchModel.updateOne(
      {
        _id: allocation.batchId,
        remainingQty: { $gte: allocation.quantityKg },
        reservedQty: { $gte: allocation.quantityKg },
      },
      [
        {
          $set: {
            remainingQty: { $subtract: ["$remainingQty", allocation.quantityKg] },
            reservedQty: { $subtract: ["$reservedQty", allocation.quantityKg] },
          },
        },
        {
          $set: {
            status: {
              $cond: [{ $lte: ["$remainingQty", 0] }, "depleted", "$status"],
            },
            depletedAt: {
              $cond: [{ $lte: ["$remainingQty", 0] }, "$$NOW", "$depletedAt"],
            },
          },
        },
      ],
      { session, updatePipeline: true }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError("تعذر خصم الكمية من الدفعة", 409);
    }

    await recordStockMovement(
      {
        rawMaterialId: allocation.rawMaterialId,
        batchId: allocation.batchId,
        quantityKg: allocation.quantityKg,
        direction: "out",
        movementType: context.movementType,
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
      },
      session
    );
  }
}

export interface AbsoluteCorrectionResult {
  batchCode: string;
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  before: number;
  after: number;
}

export async function applyAbsoluteCorrection(
  batchId: Types.ObjectId,
  newRemainingQty: number,
  session: ClientSession
): Promise<AbsoluteCorrectionResult> {
  if (newRemainingQty < 0) {
    throw new AppError("الكمية بعد التصحيح لا يجوز أن تكون سالبة", 400);
  }

  const before = await BatchModel.findOneAndUpdate(
    { _id: batchId, reservedQty: { $lte: newRemainingQty } },
    [
      { $set: { remainingQty: newRemainingQty } },
      {
        $set: {
          status: {
            $cond: [
              { $eq: [newRemainingQty, 0] },
              "depleted",
              { $cond: [{ $eq: ["$status", "depleted"] }, "active", "$status"] },
            ],
          },
          depletedAt: {
            $cond: [{ $eq: [newRemainingQty, 0] }, "$$NOW", "$depletedAt"],
          },
        },
      },
    ],
    { session, returnDocument: "before", updatePipeline: true }
  );

  if (!before) {
    const exists = await BatchModel.exists({ _id: batchId }).session(session);
    if (!exists) {
      throw new AppError("الدفعة غير موجودة", 404);
    }
    throw new AppError(
      "الكمية بعد التصحيح أقل من الكمية المحجوزة على هذه الدفعة",
      400
    );
  }

  return {
    batchCode: before.batchCode,
    rawMaterialId: before.rawMaterialId,
    rawMaterialName: before.rawMaterialName,
    rawMaterialCode: before.rawMaterialCode,
    before: before.remainingQty,
    after: newRemainingQty,
  };
}

export interface PurchaseReturnDeductionResult {
  batchCode: string;
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  unitCostPerKg: number;
}

// Returning stock to a supplier physically removes it from the warehouse, so it must
// respect the same available (remaining - reserved) guard as any other outbound movement.
export async function deductForPurchaseReturn(
  batchId: Types.ObjectId,
  quantityKg: number,
  session: ClientSession
): Promise<PurchaseReturnDeductionResult> {
  if (quantityKg <= 0) {
    throw new AppError("الكمية المطلوب إرجاعها يجب أن تكون أكبر من صفر", 400);
  }

  const batch = await BatchModel.findOneAndUpdate(
    {
      _id: batchId,
      $expr: {
        $gte: [{ $subtract: ["$remainingQty", "$reservedQty"] }, quantityKg],
      },
    },
    [
      { $set: { remainingQty: { $subtract: ["$remainingQty", quantityKg] } } },
      {
        $set: {
          status: { $cond: [{ $lte: ["$remainingQty", 0] }, "depleted", "$status"] },
          depletedAt: { $cond: [{ $lte: ["$remainingQty", 0] }, "$$NOW", "$depletedAt"] },
        },
      },
    ],
    { session, returnDocument: "after", updatePipeline: true }
  );

  if (!batch) {
    const exists = await BatchModel.exists({ _id: batchId }).session(session);
    if (!exists) {
      throw new AppError("الدفعة غير موجودة", 404);
    }
    throw new AppError("الكمية المطلوب إرجاعها أكبر من الكمية المتاحة فعليًا", 409);
  }

  return {
    batchCode: batch.batchCode,
    rawMaterialId: batch.rawMaterialId,
    rawMaterialName: batch.rawMaterialName,
    rawMaterialCode: batch.rawMaterialCode,
    unitCostPerKg: batch.unitCostPerKg,
  };
}

interface ListBatchesOptions {
  rawMaterialId?: string | undefined;
  status?: string | undefined;
  supplierId?: string | undefined;
  page: number;
  limit: number;
}

export async function listBatches(options: ListBatchesOptions) {
  const filter: Record<string, unknown> = {};

  if (options.rawMaterialId) filter.rawMaterialId = options.rawMaterialId;
  if (options.status) filter.status = options.status;
  if (options.supplierId) filter.supplierId = options.supplierId;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    BatchModel.find(filter).sort({ purchaseDate: 1 }).skip(skip).limit(options.limit),
    BatchModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getBatchById(id: string) {
  const batch = await BatchModel.findById(id);
  if (!batch) {
    throw new AppError("الدفعة غير موجودة", 404);
  }
  return batch;
}

export async function updateBatchNotes(id: string, notes: string | undefined) {
  const batch = await BatchModel.findByIdAndUpdate(
    id,
    { notes },
    { returnDocument: "after", runValidators: true }
  );
  if (!batch) {
    throw new AppError("الدفعة غير موجودة", 404);
  }
  return batch;
}
