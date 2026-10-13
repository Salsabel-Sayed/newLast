import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { createBatch } from "../../inventory/batches/batch.service.js";
import { RawMaterialModel } from "../../inventory/raw-materials/rawMaterial.model.js";
import { SupplierModel } from "../../suppliers/supplier.model.js";
import { recordLedgerEntry } from "../../finance/ledger/ledgerEntry.service.js";
import { PurchaseInvoiceModel } from "../purchase-invoices/purchaseInvoice.model.js";
import {
  PurchaseOrderModel,
  type PurchaseOrderItemAttrs,
} from "./purchaseOrder.model.js";

export interface PurchaseOrderItemInput {
  rawMaterialId: string;
  packageType: PurchaseOrderItemAttrs["packageType"];
  customPackageName?: string;
  packageCount: number;
  kgPerPackage: number;
  totalCost: number;
  productionDate?: Date;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  purchaseDate: Date;
  items: PurchaseOrderItemInput[];
  notes?: string;
}

export type UpdatePurchaseOrderInput = Partial<CreatePurchaseOrderInput>;

async function buildOrderItem(
  input: PurchaseOrderItemInput
): Promise<PurchaseOrderItemAttrs> {
  const rawMaterial = await RawMaterialModel.findById(input.rawMaterialId);
  if (!rawMaterial) {
    throw new AppError("مادة خام غير موجودة ضمن أسطر أمر الشراء", 404);
  }

  const totalKg = input.packageCount * input.kgPerPackage;
  const unitCostPerKg = input.totalCost / totalKg;

  return {
    rawMaterialId: rawMaterial._id,
    rawMaterialName: rawMaterial.name,
    rawMaterialCode: rawMaterial.code,
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

function computeTotals(items: PurchaseOrderItemAttrs[]) {
  return {
    totalKg: items.reduce((sum, item) => sum + item.totalKg, 0),
    totalAmount: items.reduce((sum, item) => sum + item.totalCost, 0),
  };
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const supplier = await SupplierModel.findById(input.supplierId);
  if (!supplier) {
    throw new AppError("المورد غير موجود", 404);
  }

  const items = await Promise.all(input.items.map(buildOrderItem));
  const { totalKg, totalAmount } = computeTotals(items);
  const orderNumber = await getNextSequenceNumber("PO");

  return PurchaseOrderModel.create({
    orderNumber,
    supplierId: supplier._id,
    supplierName: supplier.name,
    purchaseDate: input.purchaseDate,
    items,
    totalKg,
    totalAmount,
    status: "draft",
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput
) {
  const order = await PurchaseOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر الشراء غير موجود", 404);
  }
  if (order.status !== "draft") {
    throw new AppError("لا يمكن تعديل أمر شراء بعد استلامه أو إلغائه", 409);
  }

  if (input.supplierId) {
    const supplier = await SupplierModel.findById(input.supplierId);
    if (!supplier) {
      throw new AppError("المورد غير موجود", 404);
    }
    order.supplierId = supplier._id;
    order.supplierName = supplier.name;
  }

  if (input.purchaseDate) {
    order.purchaseDate = input.purchaseDate;
  }

  if (input.items) {
    const items = await Promise.all(input.items.map(buildOrderItem));
    const { totalKg, totalAmount } = computeTotals(items);
    order.items = items;
    order.totalKg = totalKg;
    order.totalAmount = totalAmount;
  }

  if (input.notes !== undefined) {
    order.notes = input.notes;
  }

  await order.save();
  return order;
}

export async function cancelPurchaseOrder(id: string) {
  const order = await PurchaseOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر الشراء غير موجود", 404);
  }
  if (order.status !== "draft") {
    throw new AppError("لا يمكن إلغاء أمر شراء بعد استلامه", 409);
  }

  order.status = "cancelled";
  await order.save();
  return order;
}

export async function receivePurchaseOrder(id: string) {
  return withTransaction(async (session) => {
    const order = await PurchaseOrderModel.findById(id).session(session);
    if (!order) {
      throw new AppError("أمر الشراء غير موجود", 404);
    }
    if (order.status !== "draft") {
      throw new AppError("لا يمكن استلام أمر شراء تم استلامه أو إلغاؤه مسبقًا", 409);
    }

    for (const item of order.items) {
      const batch = await createBatch(
        {
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: item.rawMaterialName,
          rawMaterialCode: item.rawMaterialCode,
          supplierId: order.supplierId,
          source: "purchase",
          quantityKg: item.totalKg,
          unitCostPerKg: item.unitCostPerKg,
          purchaseDate: order.purchaseDate,
          ...(item.productionDate ? { productionDate: item.productionDate } : {}),
          purchaseOrderId: order._id,
          movementType: "purchase_receipt",
          relatedEntityType: "PurchaseOrder",
          relatedEntityId: order._id,
        },
        session
      );

      item.batchId = batch._id;
    }

    const supplierBefore = await SupplierModel.findOneAndUpdate(
      { _id: order.supplierId },
      { $inc: { balance: order.totalAmount } },
      { session, returnDocument: "before" }
    );
    if (!supplierBefore) {
      throw new AppError("المورد غير موجود", 404);
    }

    const previousBalance = supplierBefore.balance;
    const currentBalance = previousBalance + order.totalAmount;

    const invoiceNumber = await getNextSequenceNumber("PI", { session });
    const invoiceDate = new Date();

    const [invoice] = await PurchaseInvoiceModel.create(
      [
        {
          invoiceNumber,
          purchaseOrderId: order._id,
          purchaseOrderNumber: order.orderNumber,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          invoiceDate,
          itemsSnapshot: order.items,
          totalAmount: order.totalAmount,
          paidAmount: 0,
          remainingAmount: order.totalAmount,
          previousBalance,
          currentBalance,
          status: "unpaid",
        },
      ],
      { session }
    );

    if (!invoice) {
      throw new AppError("تعذر إنشاء فاتورة الشراء", 500);
    }

    await recordLedgerEntry(
      {
        partyType: "supplier",
        partyId: order.supplierId,
        date: invoiceDate,
        sourceType: "purchase_invoice",
        sourceId: invoice._id,
        description: `فاتورة شراء ${invoiceNumber}`,
        debit: 0,
        credit: order.totalAmount,
      },
      session
    );

    order.status = "received";
    await order.save({ session });

    return { order, invoice };
  });
}

export async function getPurchaseOrderById(id: string) {
  const order = await PurchaseOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر الشراء غير موجود", 404);
  }
  return order;
}

interface ListPurchaseOrdersOptions {
  supplierId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listPurchaseOrders(options: ListPurchaseOrdersOptions) {
  const filter: Record<string, unknown> = {};
  if (options.supplierId) filter.supplierId = options.supplierId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    PurchaseOrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    PurchaseOrderModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
