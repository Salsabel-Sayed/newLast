import { Types, type ClientSession } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { recordStockMovement } from "../../inventory/stock-movements/stockMovement.service.js";
import { ReturnedMixBatchModel } from "./returnedMixBatch.model.js";

const QUANTITY_EPSILON = 1e-9;

export interface CreateReturnedMixBatchInput {
  recipeId: Types.ObjectId;
  recipeName: string;
  quantityKg: number;
  unitCostPerKg: number;
  sourceReturnId: Types.ObjectId;
  returnDate: Date;
}

export async function createReturnedMixBatch(
  input: CreateReturnedMixBatchInput,
  session: ClientSession
) {
  const [batch] = await ReturnedMixBatchModel.create(
    [
      {
        recipeId: input.recipeId,
        recipeName: input.recipeName,
        originalQty: input.quantityKg,
        remainingQty: input.quantityKg,
        reservedQty: 0,
        unitCostPerKg: input.unitCostPerKg,
        sourceReturnId: input.sourceReturnId,
        returnDate: input.returnDate,
        status: "active",
      },
    ],
    { session }
  );

  if (!batch) {
    throw new AppError("تعذر إنشاء دفعة التوليفة المرتجعة", 500);
  }

  await recordStockMovement(
    {
      returnedMixBatchId: batch._id,
      quantityKg: input.quantityKg,
      direction: "in",
      movementType: "returned_mix_in",
      relatedEntityType: "Return",
      relatedEntityId: input.sourceReturnId,
    },
    session
  );

  return batch;
}

export interface ReturnedMixAllocation {
  returnedMixBatchId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

export async function allocateReturnedMixFifo(
  recipeId: Types.ObjectId,
  quantityKg: number,
  session: ClientSession
): Promise<ReturnedMixAllocation[]> {
  if (quantityKg <= 0) {
    throw new AppError("الكمية المطلوبة يجب أن تكون أكبر من صفر", 400);
  }

  const batches = await ReturnedMixBatchModel.find({ recipeId, status: "active" })
    .sort({ returnDate: 1, _id: 1 })
    .session(session);

  const allocations: ReturnedMixAllocation[] = [];
  let remaining = quantityKg;

  for (const batch of batches) {
    if (remaining <= QUANTITY_EPSILON) break;

    const available = batch.remainingQty - batch.reservedQty;
    if (available <= QUANTITY_EPSILON) continue;

    const take = Math.min(available, remaining);
    allocations.push({
      returnedMixBatchId: batch._id,
      quantityKg: take,
      unitCostPerKg: batch.unitCostPerKg,
    });
    remaining -= take;
  }

  if (remaining > QUANTITY_EPSILON) {
    throw new AppError("الكمية المتاحة من التوليفة المرتجعة غير كافية", 409);
  }

  return allocations;
}

interface AllocationContext {
  relatedEntityType: string;
  relatedEntityId: Types.ObjectId;
}

// Reservation/release are soft holds only — the spec's movementType enum has no
// reservation-tracking variant for ReturnedMixBatch (unlike raw-material Batches),
// so no StockMovement is written here; only actual in/out transitions are audited.
export async function reserveReturnedMix(
  allocations: ReturnedMixAllocation[],
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await ReturnedMixBatchModel.updateOne(
      {
        _id: allocation.returnedMixBatchId,
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
      throw new AppError("تعذر حجز الكمية المطلوبة من التوليفة المرتجعة", 409);
    }
  }
}

export async function releaseReturnedMix(
  allocations: ReturnedMixAllocation[],
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await ReturnedMixBatchModel.updateOne(
      {
        _id: allocation.returnedMixBatchId,
        reservedQty: { $gte: allocation.quantityKg },
      },
      { $inc: { reservedQty: -allocation.quantityKg } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError("تعذر إلغاء حجز الكمية من التوليفة المرتجعة", 409);
    }
  }
}

export async function issueReturnedMix(
  allocations: ReturnedMixAllocation[],
  context: AllocationContext,
  session: ClientSession
): Promise<void> {
  for (const allocation of allocations) {
    const result = await ReturnedMixBatchModel.updateOne(
      {
        _id: allocation.returnedMixBatchId,
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
            status: { $cond: [{ $lte: ["$remainingQty", 0] }, "depleted", "$status"] },
          },
        },
      ],
      { session, updatePipeline: true }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError("تعذر خصم الكمية من التوليفة المرتجعة", 409);
    }

    await recordStockMovement(
      {
        returnedMixBatchId: allocation.returnedMixBatchId,
        quantityKg: allocation.quantityKg,
        direction: "out",
        movementType: "returned_mix_out",
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
      },
      session
    );
  }
}

export async function convertReturnedMixToLoss(id: string, quantityKg: number) {
  if (quantityKg <= 0) {
    throw new AppError("الكمية المطلوب تحويلها لخسارة يجب أن تكون أكبر من صفر", 400);
  }

  return withTransaction(async (session) => {
    const batchObjectId = new Types.ObjectId(id);

    const batch = await ReturnedMixBatchModel.findOneAndUpdate(
      {
        _id: batchObjectId,
        $expr: {
          $gte: [{ $subtract: ["$remainingQty", "$reservedQty"] }, quantityKg],
        },
      },
      [
        { $set: { remainingQty: { $subtract: ["$remainingQty", quantityKg] } } },
        {
          $set: {
            status: { $cond: [{ $lte: ["$remainingQty", 0] }, "disposed", "$status"] },
          },
        },
      ],
      { session, returnDocument: "after", updatePipeline: true }
    );

    if (!batch) {
      const exists = await ReturnedMixBatchModel.exists({ _id: batchObjectId }).session(
        session
      );
      if (!exists) {
        throw new AppError("دفعة التوليفة المرتجعة غير موجودة", 404);
      }
      throw new AppError("الكمية المطلوب تحويلها لخسارة أكبر من الكمية المتاحة", 409);
    }

    await recordStockMovement(
      {
        returnedMixBatchId: batch._id,
        quantityKg,
        direction: "out",
        movementType: "returned_mix_out",
        relatedEntityType: "ReturnedMixBatch",
        relatedEntityId: batch._id,
        notes: "تحويل إلى خسارة/تالف",
      },
      session
    );

    return batch;
  });
}

export async function getReturnedMixBatchById(id: string) {
  const batch = await ReturnedMixBatchModel.findById(id);
  if (!batch) {
    throw new AppError("دفعة التوليفة المرتجعة غير موجودة", 404);
  }
  return batch;
}

interface ListReturnedMixBatchesOptions {
  recipeId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listReturnedMixBatches(options: ListReturnedMixBatchesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.recipeId) filter.recipeId = options.recipeId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    ReturnedMixBatchModel.find(filter)
      .sort({ returnDate: 1 })
      .skip(skip)
      .limit(options.limit),
    ReturnedMixBatchModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
