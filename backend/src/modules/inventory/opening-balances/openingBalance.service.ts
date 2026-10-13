import { Types } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { createBatch } from "../batches/batch.service.js";
import { RawMaterialModel } from "../raw-materials/rawMaterial.model.js";
import { SupplierModel } from "../../suppliers/supplier.model.js";
import {
  OpeningBalanceModel,
  type OpeningBalanceItemAttrs,
} from "./openingBalance.model.js";

export interface CreateOpeningBalanceItemInput {
  rawMaterialId: string;
  supplierId?: string;
  packageType: OpeningBalanceItemAttrs["packageType"];
  customPackageName?: string;
  packageCount: number;
  kgPerPackage: number;
  totalCost: number;
  productionDate?: Date;
}

export interface CreateOpeningBalanceInput {
  openingDate: Date;
  items: CreateOpeningBalanceItemInput[];
  notes?: string;
}

async function buildOpeningBalanceItem(
  input: CreateOpeningBalanceItemInput
): Promise<OpeningBalanceItemAttrs> {
  const rawMaterial = await RawMaterialModel.findById(input.rawMaterialId);
  if (!rawMaterial) {
    throw new AppError("مادة خام غير موجودة ضمن أسطر الرصيد الافتتاحي", 404);
  }

  let supplierFields: Pick<OpeningBalanceItemAttrs, "supplierId" | "supplierName"> | Record<string, never> = {};
  if (input.supplierId) {
    const supplier = await SupplierModel.findById(input.supplierId);
    if (!supplier) {
      throw new AppError("مورد غير موجود ضمن أسطر الرصيد الافتتاحي", 404);
    }
    supplierFields = {
      supplierId: new Types.ObjectId(input.supplierId),
      supplierName: supplier.name,
    };
  }

  const totalKg = input.packageCount * input.kgPerPackage;
  const unitCostPerKg = input.totalCost / totalKg;

  return {
    rawMaterialId: rawMaterial._id,
    rawMaterialName: rawMaterial.name,
    rawMaterialCode: rawMaterial.code,
    ...supplierFields,
    packageType: input.packageType,
    ...(input.customPackageName
      ? { customPackageName: input.customPackageName }
      : {}),
    packageCount: input.packageCount,
    kgPerPackage: input.kgPerPackage,
    totalKg,
    totalCost: input.totalCost,
    unitCostPerKg,
    ...(input.productionDate ? { productionDate: input.productionDate } : {}),
  };
}

export async function createOpeningBalance(input: CreateOpeningBalanceInput) {
  const items = await Promise.all(input.items.map(buildOpeningBalanceItem));
  const openingNumber = await getNextSequenceNumber("OB");

  return OpeningBalanceModel.create({
    openingNumber,
    openingDate: input.openingDate,
    items,
    status: "draft",
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export async function postOpeningBalance(id: string) {
  return withTransaction(async (session) => {
    const openingBalance = await OpeningBalanceModel.findById(id).session(session);
    if (!openingBalance) {
      throw new AppError("الرصيد الافتتاحي غير موجود", 404);
    }
    if (openingBalance.status === "posted") {
      throw new AppError("تم اعتماد هذا الرصيد الافتتاحي مسبقًا", 409);
    }

    for (const item of openingBalance.items) {
      const batch = await createBatch(
        {
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: item.rawMaterialName,
          rawMaterialCode: item.rawMaterialCode,
          ...(item.supplierId ? { supplierId: item.supplierId } : {}),
          source: "opening_balance",
          quantityKg: item.totalKg,
          unitCostPerKg: item.unitCostPerKg,
          purchaseDate: openingBalance.openingDate,
          ...(item.productionDate ? { productionDate: item.productionDate } : {}),
          movementType: "opening_balance",
          relatedEntityType: "OpeningBalance",
          relatedEntityId: openingBalance._id,
        },
        session
      );

      item.batchId = batch._id;
    }

    openingBalance.status = "posted";
    await openingBalance.save({ session });

    return openingBalance;
  });
}

export async function getOpeningBalanceById(id: string) {
  const openingBalance = await OpeningBalanceModel.findById(id);
  if (!openingBalance) {
    throw new AppError("الرصيد الافتتاحي غير موجود", 404);
  }
  return openingBalance;
}

interface ListOpeningBalancesOptions {
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listOpeningBalances(options: ListOpeningBalancesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    OpeningBalanceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    OpeningBalanceModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
