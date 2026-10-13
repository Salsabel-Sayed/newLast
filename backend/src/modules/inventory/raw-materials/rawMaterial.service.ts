import { Types, type HydratedDocument } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import {
  guardedDelete,
  type DeleteOutcome,
} from "../../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { escapeRegex } from "../../../shared/utils/escapeRegex.js";
import { BatchModel } from "../batches/batch.model.js";
import { StockMovementModel } from "../stock-movements/stockMovement.model.js";
import { RawMaterialModel, type RawMaterialAttrs } from "./rawMaterial.model.js";

export interface CreateRawMaterialInput {
  code: string;
  name: string;
  categoryId?: string;
  minStockLevel?: number;
  supplierIds?: string[];
  isActive?: boolean;
  notes?: string;
}

export type UpdateRawMaterialInput = Partial<CreateRawMaterialInput>;

export interface StockSummary {
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  averageCostPerKg: number;
}

const EMPTY_SUMMARY: StockSummary = {
  totalQuantity: 0,
  reservedQuantity: 0,
  availableQuantity: 0,
  inventoryValue: 0,
  averageCostPerKg: 0,
};

export async function computeStockSummaries(
  rawMaterialIds: Types.ObjectId[]
): Promise<Map<string, StockSummary>> {
  const map = new Map<string, StockSummary>();
  if (rawMaterialIds.length === 0) {
    return map;
  }

  const rows = await BatchModel.aggregate<{
    _id: Types.ObjectId;
    totalQuantity: number;
    reservedQuantity: number;
    inventoryValue: number;
  }>([
    { $match: { status: "active", rawMaterialId: { $in: rawMaterialIds } } },
    {
      $group: {
        _id: "$rawMaterialId",
        totalQuantity: { $sum: "$remainingQty" },
        reservedQuantity: { $sum: "$reservedQty" },
        inventoryValue: {
          $sum: { $multiply: ["$remainingQty", "$unitCostPerKg"] },
        },
      },
    },
  ]);

  for (const row of rows) {
    const availableQuantity = row.totalQuantity - row.reservedQuantity;
    map.set(row._id.toString(), {
      totalQuantity: row.totalQuantity,
      reservedQuantity: row.reservedQuantity,
      availableQuantity,
      inventoryValue: row.inventoryValue,
      averageCostPerKg:
        row.totalQuantity > 0 ? row.inventoryValue / row.totalQuantity : 0,
    });
  }

  return map;
}

function toRawMaterialResponse(
  doc: HydratedDocument<RawMaterialAttrs>,
  summary: StockSummary
) {
  return { ...doc.toObject(), ...summary };
}

interface ListRawMaterialsOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  categoryId?: string | undefined;
  page: number;
  limit: number;
}

export async function listRawMaterials(options: ListRawMaterialsOptions) {
  const filter: Record<string, unknown> = {};

  if (options.isActive !== undefined) {
    filter.isActive = options.isActive;
  }
  if (options.categoryId) {
    filter.categoryId = options.categoryId;
  }
  if (options.search) {
    const regex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [{ code: regex }, { name: regex }];
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    RawMaterialModel.find(filter).sort({ name: 1 }).skip(skip).limit(options.limit),
    RawMaterialModel.countDocuments(filter),
  ]);

  const summaries = await computeStockSummaries(items.map((item) => item._id));
  const withSummaries = items.map((item) =>
    toRawMaterialResponse(item, summaries.get(item.id) ?? EMPTY_SUMMARY)
  );

  return buildPaginatedResult(withSummaries, total, options.page, options.limit);
}

async function enrichRawMaterial(doc: HydratedDocument<RawMaterialAttrs>) {
  const summaries = await computeStockSummaries([doc._id]);
  return toRawMaterialResponse(doc, summaries.get(doc.id) ?? EMPTY_SUMMARY);
}

export async function getRawMaterialById(id: string) {
  const rawMaterial = await RawMaterialModel.findById(id);
  if (!rawMaterial) {
    throw new AppError("المادة الخام غير موجودة", 404);
  }
  return enrichRawMaterial(rawMaterial);
}

export async function createRawMaterial(data: CreateRawMaterialInput) {
  const existing = await RawMaterialModel.findOne({ code: data.code });
  if (existing) {
    throw new AppError("كود المادة الخام مستخدم بالفعل", 409);
  }
  const rawMaterial = await RawMaterialModel.create(data);
  return enrichRawMaterial(rawMaterial);
}

export async function updateRawMaterial(id: string, data: UpdateRawMaterialInput) {
  if (data.code) {
    const existing = await RawMaterialModel.findOne({
      code: data.code,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError("كود المادة الخام مستخدم بالفعل", 409);
    }
  }

  const rawMaterial = await RawMaterialModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!rawMaterial) {
    throw new AppError("المادة الخام غير موجودة", 404);
  }

  return enrichRawMaterial(rawMaterial);
}

export async function deleteRawMaterial(id: string): Promise<DeleteOutcome> {
  return guardedDelete(RawMaterialModel, id, [
    { model: BatchModel, field: "rawMaterialId" },
    { model: StockMovementModel, field: "rawMaterialId" },
  ]);
}

export async function listLowStockRawMaterials() {
  const rawMaterials = await RawMaterialModel.find({ isActive: true }).sort({
    name: 1,
  });
  const summaries = await computeStockSummaries(rawMaterials.map((r) => r._id));

  return rawMaterials
    .map((item) => toRawMaterialResponse(item, summaries.get(item.id) ?? EMPTY_SUMMARY))
    .filter((item) => item.availableQuantity <= item.minStockLevel);
}
