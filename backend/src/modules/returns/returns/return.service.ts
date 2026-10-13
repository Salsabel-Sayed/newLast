import { Types, type ClientSession } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { buildDateRangeFilter } from "../../../shared/http/dateRange.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { createBatch, deductForPurchaseReturn } from "../../inventory/batches/batch.service.js";
import { recordStockMovement } from "../../inventory/stock-movements/stockMovement.service.js";
import { CustomerModel } from "../../customers/customer.model.js";
import { SupplierModel } from "../../suppliers/supplier.model.js";
import { SalesOrderModel } from "../../sales/sales-orders/salesOrder.model.js";
import { SalesInvoiceModel } from "../../sales/sales-invoices/salesInvoice.model.js";
import { PurchaseOrderModel } from "../../purchases/purchase-orders/purchaseOrder.model.js";
import { recordLedgerEntry } from "../../finance/ledger/ledgerEntry.service.js";
import { createReturnedMixBatch } from "../returned-mixes/returnedMixBatch.service.js";
import {
  ReturnModel,
  type ReturnItemAttrs,
  type ReturnType,
  type ReturnDisposition,
} from "./return.model.js";

export interface CreateReturnItemInput {
  rawMaterialId?: string;
  recipeId?: string;
  disposition?: ReturnDisposition;
  batchId?: string;
  quantityKg: number;
}

export interface CreateReturnInput {
  returnType: ReturnType;
  returnDate: Date;
  customerId?: string;
  supplierId?: string;
  salesOrderId?: string;
  purchaseOrderId?: string;
  items: CreateReturnItemInput[];
  notes?: string;
}

async function incrementInvoiceReturns(
  salesOrderId: Types.ObjectId,
  amount: number,
  session: ClientSession
): Promise<void> {
  await SalesInvoiceModel.updateOne(
    { salesOrderId },
    { $inc: { totalReturns: amount } },
    { session }
  );
}

async function createSalesRawMaterialReturn(input: CreateReturnInput) {
  if (!input.customerId || !input.salesOrderId) {
    throw new AppError("بيانات المرتجع ناقصة", 400);
  }

  return withTransaction(async (session) => {
    const customer = await CustomerModel.findById(input.customerId).session(session);
    if (!customer) throw new AppError("العميل غير موجود", 404);

    const order = await SalesOrderModel.findById(input.salesOrderId).session(session);
    if (!order) throw new AppError("أمر البيع غير موجود", 404);
    if (order.status !== "delivered") {
      throw new AppError("لا يمكن إنشاء مرتجع لأمر بيع لم يتم تسليمه", 409);
    }

    const returnId = new Types.ObjectId();
    const items: ReturnItemAttrs[] = [];
    let totalAmount = 0;

    for (const inputItem of input.items) {
      if (!inputItem.rawMaterialId) {
        throw new AppError("يجب تحديد المادة الخام لكل سطر", 400);
      }
      const originalItem = order.items.find(
        (item) =>
          item.itemType === "raw_material" &&
          item.rawMaterialId?.toString() === inputItem.rawMaterialId
      );
      if (
        !originalItem ||
        !originalItem.rawMaterialId ||
        !originalItem.rawMaterialName ||
        !originalItem.rawMaterialCode
      ) {
        throw new AppError("لم يتم العثور على هذه المادة الخام ضمن أمر البيع الأصلي", 404);
      }

      const batch = await createBatch(
        {
          rawMaterialId: originalItem.rawMaterialId,
          rawMaterialName: originalItem.rawMaterialName,
          rawMaterialCode: originalItem.rawMaterialCode,
          source: "sales_return",
          quantityKg: inputItem.quantityKg,
          unitCostPerKg: originalItem.costPerKg,
          purchaseDate: input.returnDate,
          sourceReturnId: returnId,
          movementType: "sales_return",
          relatedEntityType: "Return",
          relatedEntityId: returnId,
        },
        session
      );

      const lineTotal = inputItem.quantityKg * originalItem.unitPrice;
      totalAmount += lineTotal;

      items.push({
        rawMaterialId: originalItem.rawMaterialId,
        rawMaterialName: originalItem.rawMaterialName,
        rawMaterialCode: originalItem.rawMaterialCode,
        quantityKg: inputItem.quantityKg,
        unitPrice: originalItem.unitPrice,
        unitCostPerKg: originalItem.costPerKg,
        lineTotal,
        newBatchId: batch._id,
      });
    }

    await CustomerModel.updateOne(
      { _id: customer._id },
      { $inc: { balance: -totalAmount } },
      { session }
    );
    await incrementInvoiceReturns(order._id, totalAmount, session);

    const returnNumber = await getNextSequenceNumber("RET", { session });

    const [returnDoc] = await ReturnModel.create(
      [
        {
          _id: returnId,
          returnNumber,
          returnType: "sales_raw_material",
          customerId: customer._id,
          customerName: customer.name,
          salesOrderId: order._id,
          returnDate: input.returnDate,
          items,
          totalAmount,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ],
      { session }
    );
    if (!returnDoc) throw new AppError("تعذر إنشاء المرتجع", 500);

    await recordLedgerEntry(
      {
        partyType: "customer",
        partyId: customer._id,
        date: input.returnDate,
        sourceType: "sales_return",
        sourceId: returnId,
        description: `مرتجع بيع ${returnNumber}`,
        debit: 0,
        credit: totalAmount,
      },
      session
    );

    return returnDoc;
  });
}

async function createSalesRecipeReturn(input: CreateReturnInput) {
  if (!input.customerId || !input.salesOrderId) {
    throw new AppError("بيانات المرتجع ناقصة", 400);
  }

  return withTransaction(async (session) => {
    const customer = await CustomerModel.findById(input.customerId).session(session);
    if (!customer) throw new AppError("العميل غير موجود", 404);

    const order = await SalesOrderModel.findById(input.salesOrderId).session(session);
    if (!order) throw new AppError("أمر البيع غير موجود", 404);
    if (order.status !== "delivered") {
      throw new AppError("لا يمكن إنشاء مرتجع لأمر بيع لم يتم تسليمه", 409);
    }

    const returnId = new Types.ObjectId();
    const items: ReturnItemAttrs[] = [];
    let totalAmount = 0;

    for (const inputItem of input.items) {
      if (!inputItem.recipeId || !inputItem.disposition) {
        throw new AppError("يجب تحديد التوليفة وطريقة التعامل معها لكل سطر", 400);
      }
      const originalItem = order.items.find(
        (item) => item.itemType === "recipe" && item.recipeId?.toString() === inputItem.recipeId
      );
      if (!originalItem || !originalItem.recipeId || !originalItem.recipeName) {
        throw new AppError("لم يتم العثور على هذه التوليفة ضمن أمر البيع الأصلي", 404);
      }

      let returnedMixBatchId: Types.ObjectId | undefined;

      if (inputItem.disposition === "return_to_stock") {
        const mixBatch = await createReturnedMixBatch(
          {
            recipeId: originalItem.recipeId,
            recipeName: originalItem.recipeName,
            quantityKg: inputItem.quantityKg,
            unitCostPerKg: originalItem.costPerKg,
            sourceReturnId: returnId,
            returnDate: input.returnDate,
          },
          session
        );
        returnedMixBatchId = mixBatch._id;
      }

      const lineTotal = inputItem.quantityKg * originalItem.unitPrice;
      totalAmount += lineTotal;

      items.push({
        recipeId: originalItem.recipeId,
        recipeName: originalItem.recipeName,
        ...(originalItem.recipeCode ? { recipeCode: originalItem.recipeCode } : {}),
        disposition: inputItem.disposition,
        ...(returnedMixBatchId ? { returnedMixBatchId } : {}),
        quantityKg: inputItem.quantityKg,
        unitPrice: originalItem.unitPrice,
        unitCostPerKg: originalItem.costPerKg,
        lineTotal,
      });
    }

    await CustomerModel.updateOne(
      { _id: customer._id },
      { $inc: { balance: -totalAmount } },
      { session }
    );
    await incrementInvoiceReturns(order._id, totalAmount, session);

    const returnNumber = await getNextSequenceNumber("RET", { session });

    const [returnDoc] = await ReturnModel.create(
      [
        {
          _id: returnId,
          returnNumber,
          returnType: "sales_recipe",
          customerId: customer._id,
          customerName: customer.name,
          salesOrderId: order._id,
          returnDate: input.returnDate,
          items,
          totalAmount,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ],
      { session }
    );
    if (!returnDoc) throw new AppError("تعذر إنشاء المرتجع", 500);

    await recordLedgerEntry(
      {
        partyType: "customer",
        partyId: customer._id,
        date: input.returnDate,
        sourceType: "sales_return",
        sourceId: returnId,
        description: `مرتجع توليفة ${returnNumber}`,
        debit: 0,
        credit: totalAmount,
      },
      session
    );

    return returnDoc;
  });
}

async function createPurchaseReturn(input: CreateReturnInput) {
  if (!input.supplierId || !input.purchaseOrderId) {
    throw new AppError("بيانات المرتجع ناقصة", 400);
  }

  return withTransaction(async (session) => {
    const supplier = await SupplierModel.findById(input.supplierId).session(session);
    if (!supplier) throw new AppError("المورد غير موجود", 404);

    const order = await PurchaseOrderModel.findById(input.purchaseOrderId).session(session);
    if (!order) throw new AppError("أمر الشراء غير موجود", 404);
    if (order.status !== "received") {
      throw new AppError("لا يمكن إنشاء مرتجع لأمر شراء لم يتم استلامه", 409);
    }

    const returnId = new Types.ObjectId();
    const items: ReturnItemAttrs[] = [];
    let totalAmount = 0;

    for (const inputItem of input.items) {
      if (!inputItem.batchId) {
        throw new AppError("يجب تحديد الدفعة لكل سطر", 400);
      }
      const batchObjectId = new Types.ObjectId(inputItem.batchId);
      const result = await deductForPurchaseReturn(batchObjectId, inputItem.quantityKg, session);

      const lineTotal = inputItem.quantityKg * result.unitCostPerKg;
      totalAmount += lineTotal;

      items.push({
        batchId: batchObjectId,
        batchCode: result.batchCode,
        rawMaterialId: result.rawMaterialId,
        rawMaterialName: result.rawMaterialName,
        rawMaterialCode: result.rawMaterialCode,
        quantityKg: inputItem.quantityKg,
        unitCostPerKg: result.unitCostPerKg,
        lineTotal,
      });

      await recordStockMovement(
        {
          rawMaterialId: result.rawMaterialId,
          batchId: batchObjectId,
          quantityKg: inputItem.quantityKg,
          direction: "out",
          movementType: "purchase_return",
          relatedEntityType: "Return",
          relatedEntityId: returnId,
        },
        session
      );
    }

    await SupplierModel.updateOne(
      { _id: supplier._id },
      { $inc: { balance: -totalAmount } },
      { session }
    );

    const returnNumber = await getNextSequenceNumber("RET", { session });

    const [returnDoc] = await ReturnModel.create(
      [
        {
          _id: returnId,
          returnNumber,
          returnType: "purchase_return",
          supplierId: supplier._id,
          supplierName: supplier.name,
          purchaseOrderId: order._id,
          returnDate: input.returnDate,
          items,
          totalAmount,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ],
      { session }
    );
    if (!returnDoc) throw new AppError("تعذر إنشاء المرتجع", 500);

    await recordLedgerEntry(
      {
        partyType: "supplier",
        partyId: supplier._id,
        date: input.returnDate,
        sourceType: "purchase_return",
        sourceId: returnId,
        description: `مرتجع شراء ${returnNumber}`,
        debit: totalAmount,
        credit: 0,
      },
      session
    );

    return returnDoc;
  });
}

export async function createReturn(input: CreateReturnInput) {
  if (input.returnType === "sales_raw_material") {
    return createSalesRawMaterialReturn(input);
  }
  if (input.returnType === "sales_recipe") {
    return createSalesRecipeReturn(input);
  }
  return createPurchaseReturn(input);
}

export async function getReturnById(id: string) {
  const returnDoc = await ReturnModel.findById(id);
  if (!returnDoc) {
    throw new AppError("المرتجع غير موجود", 404);
  }
  return returnDoc;
}

interface ListReturnsOptions {
  returnType?: string | undefined;
  customerId?: string | undefined;
  supplierId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  page: number;
  limit: number;
}

export async function listReturns(options: ListReturnsOptions) {
  const filter: Record<string, unknown> = {
    ...buildDateRangeFilter("returnDate", options),
  };
  if (options.returnType) filter.returnType = options.returnType;
  if (options.customerId) filter.customerId = options.customerId;
  if (options.supplierId) filter.supplierId = options.supplierId;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    ReturnModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit),
    ReturnModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
