import { Types, type ClientSession } from "mongoose";
import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import {
  allocateFifo,
  reserveAllocations,
  releaseAllocations,
  issueAllocations,
  type BatchAllocation,
} from "../../inventory/batches/batch.service.js";
import {
  allocateReturnedMixFifo,
  reserveReturnedMix,
  releaseReturnedMix,
  issueReturnedMix,
  type ReturnedMixAllocation,
} from "../../returns/returned-mixes/returnedMixBatch.service.js";
import { RawMaterialModel } from "../../inventory/raw-materials/rawMaterial.model.js";
import { RecipeModel } from "../../recipes/recipes/recipe.model.js";
import { CustomerModel } from "../../customers/customer.model.js";
import { recordLedgerEntry } from "../../finance/ledger/ledgerEntry.service.js";
import { SalesInvoiceModel } from "../sales-invoices/salesInvoice.model.js";
import {
  SalesOrderModel,
  type SalesOrderItemAttrs,
  type BatchAllocationSnapshot,
  type RecipeComponentAllocation,
  type ReturnedMixAllocationSnapshot,
  type DeliveryMethod,
} from "./salesOrder.model.js";

export interface SalesOrderItemInput {
  itemType: "raw_material" | "recipe" | "returned_mix";
  rawMaterialId?: string;
  recipeId?: string;
  recipeComponents?: { rawMaterialId: string; gramsPerKg: number }[];
  quantityKg: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface CreateSalesOrderInput {
  customerId: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  deliveryMethod: DeliveryMethod;
  items: SalesOrderItemInput[];
  notes?: string;
}

export type UpdateSalesOrderInput = Partial<CreateSalesOrderInput>;

function computeDiscount(lineSubtotal: number, input: SalesOrderItemInput): number {
  if (input.discountPercent !== undefined) {
    return lineSubtotal * (input.discountPercent / 100);
  }
  return input.discountAmount ?? 0;
}

async function buildOrderItem(input: SalesOrderItemInput): Promise<SalesOrderItemAttrs> {
  const lineSubtotal = input.quantityKg * input.unitPrice;
  const discountAmount = computeDiscount(lineSubtotal, input);
  const lineTotal = lineSubtotal - discountAmount;

  const base = {
    quantityKg: input.quantityKg,
    unitPrice: input.unitPrice,
    ...(input.discountPercent !== undefined
      ? { discountPercent: input.discountPercent }
      : {}),
    discountAmount,
    batchAllocations: [],
    recipeComponents: [],
    recipeComponentAllocations: [],
    returnedMixAllocations: [],
    costPerKg: 0,
    lineSubtotal,
    lineTotal,
  };

  if (input.itemType === "raw_material") {
    if (!input.rawMaterialId) {
      throw new AppError("يجب تحديد المادة الخام لسطر من نوع raw_material", 400);
    }
    const rawMaterial = await RawMaterialModel.findById(input.rawMaterialId);
    if (!rawMaterial) {
      throw new AppError("مادة خام غير موجودة ضمن أسطر أمر البيع", 404);
    }
    return {
      ...base,
      itemType: "raw_material",
      rawMaterialId: rawMaterial._id,
      rawMaterialName: rawMaterial.name,
      rawMaterialCode: rawMaterial.code,
    };
  }

  if (input.itemType === "returned_mix") {
    if (!input.recipeId) {
      throw new AppError("يجب تحديد التوليفة لسطر من نوع returned_mix", 400);
    }
    const recipe = await RecipeModel.findById(input.recipeId);
    if (!recipe) {
      throw new AppError("الوصفة غير موجودة ضمن أسطر أمر البيع", 404);
    }
    return {
      ...base,
      itemType: "returned_mix",
      recipeId: recipe._id,
      recipeName: recipe.name,
      recipeCode: recipe.code,
    };
  }

  if (!input.recipeId || !input.recipeComponents) {
    throw new AppError("يجب تحديد الوصفة ومكوناتها لسطر من نوع recipe", 400);
  }

  const recipe = await RecipeModel.findById(input.recipeId);
  if (!recipe) {
    throw new AppError("الوصفة غير موجودة ضمن أسطر أمر البيع", 404);
  }

  const recipeComponents = await Promise.all(
    input.recipeComponents.map(async (component) => {
      const rawMaterial = await RawMaterialModel.findById(component.rawMaterialId);
      if (!rawMaterial) {
        throw new AppError("مادة خام غير موجودة ضمن مكونات التوليفة", 404);
      }
      return {
        rawMaterialId: rawMaterial._id,
        rawMaterialCode: rawMaterial.code,
        rawMaterialName: rawMaterial.name,
        gramsPerKg: component.gramsPerKg,
      };
    })
  );

  return {
    ...base,
    itemType: "recipe",
    recipeId: recipe._id,
    recipeName: recipe.name,
    recipeCode: recipe.code,
    recipeComponents,
  };
}

function computeOrderTotals(items: SalesOrderItemAttrs[]) {
  return {
    subtotal: items.reduce((sum, item) => sum + item.lineSubtotal, 0),
    discountAmount: items.reduce((sum, item) => sum + item.discountAmount, 0),
    totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

function requireRawMaterialId(item: SalesOrderItemAttrs): Types.ObjectId {
  if (!item.rawMaterialId) {
    throw new AppError("بيانات المادة الخام ناقصة في سطر أمر البيع", 500);
  }
  return item.rawMaterialId;
}

function requireRecipeId(item: SalesOrderItemAttrs): Types.ObjectId {
  if (!item.recipeId) {
    throw new AppError("بيانات التوليفة ناقصة في سطر أمر البيع", 500);
  }
  return item.recipeId;
}

function toReturnedMixAllocations(
  snapshots: ReturnedMixAllocationSnapshot[]
): ReturnedMixAllocation[] {
  return snapshots.map((snapshot) => ({
    returnedMixBatchId: snapshot.returnedMixBatchId,
    quantityKg: snapshot.quantityKg,
    unitCostPerKg: snapshot.unitCostPerKg,
  }));
}

function toReturnedMixSnapshots(
  allocations: ReturnedMixAllocation[]
): ReturnedMixAllocationSnapshot[] {
  return allocations.map((allocation) => ({
    returnedMixBatchId: allocation.returnedMixBatchId,
    quantityKg: allocation.quantityKg,
    unitCostPerKg: allocation.unitCostPerKg,
  }));
}

function returnedMixWeightedCostPerKg(
  allocations: ReturnedMixAllocation[],
  quantityKg: number
): number {
  if (quantityKg <= 0) return 0;
  const totalCost = allocations.reduce(
    (sum, allocation) => sum + allocation.quantityKg * allocation.unitCostPerKg,
    0
  );
  return totalCost / quantityKg;
}

function toBatchAllocations(
  snapshots: BatchAllocationSnapshot[],
  rawMaterialId: Types.ObjectId
): BatchAllocation[] {
  return snapshots.map((snapshot) => ({
    batchId: snapshot.batchId,
    rawMaterialId,
    quantityKg: snapshot.quantityKg,
    unitCostPerKg: snapshot.unitCostPerKg,
  }));
}

function toSnapshots(allocations: BatchAllocation[]): BatchAllocationSnapshot[] {
  return allocations.map((allocation) => ({
    batchId: allocation.batchId,
    quantityKg: allocation.quantityKg,
    unitCostPerKg: allocation.unitCostPerKg,
  }));
}

function weightedCostPerKg(allocations: BatchAllocation[], quantityKg: number): number {
  if (quantityKg <= 0) return 0;
  const totalCost = allocations.reduce(
    (sum, allocation) => sum + allocation.quantityKg * allocation.unitCostPerKg,
    0
  );
  return totalCost / quantityKg;
}

export async function createSalesOrder(input: CreateSalesOrderInput) {
  const customer = await CustomerModel.findById(input.customerId);
  if (!customer) {
    throw new AppError("العميل غير موجود", 404);
  }

  const items = await Promise.all(input.items.map(buildOrderItem));
  const totals = computeOrderTotals(items);
  const orderNumber = await getNextSequenceNumber("SO");

  return SalesOrderModel.create({
    orderNumber,
    customerId: customer._id,
    customerName: customer.name,
    orderDate: input.orderDate,
    ...(input.expectedDeliveryDate
      ? { expectedDeliveryDate: input.expectedDeliveryDate }
      : {}),
    deliveryMethod: input.deliveryMethod,
    items,
    ...totals,
    status: "draft",
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export async function updateSalesOrder(id: string, input: UpdateSalesOrderInput) {
  const order = await SalesOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر البيع غير موجود", 404);
  }
  if (order.status !== "draft") {
    throw new AppError("لا يمكن تعديل أمر بيع بعد تأكيده أو إلغائه", 409);
  }

  if (input.customerId) {
    const customer = await CustomerModel.findById(input.customerId);
    if (!customer) {
      throw new AppError("العميل غير موجود", 404);
    }
    order.customerId = customer._id;
    order.customerName = customer.name;
  }

  if (input.orderDate) order.orderDate = input.orderDate;
  if (input.expectedDeliveryDate) order.expectedDeliveryDate = input.expectedDeliveryDate;
  if (input.deliveryMethod) order.deliveryMethod = input.deliveryMethod;

  if (input.items) {
    const items = await Promise.all(input.items.map(buildOrderItem));
    const totals = computeOrderTotals(items);
    order.items = items;
    order.subtotal = totals.subtotal;
    order.discountAmount = totals.discountAmount;
    order.totalAmount = totals.totalAmount;
  }

  if (input.notes !== undefined) order.notes = input.notes;

  await order.save();
  return order;
}

async function reserveItem(
  item: SalesOrderItemAttrs,
  orderId: Types.ObjectId,
  session: ClientSession
): Promise<void> {
  if (item.itemType === "raw_material") {
    const rawMaterialId = requireRawMaterialId(item);
    const allocations = await allocateFifo(rawMaterialId, item.quantityKg, session);
    await reserveAllocations(
      allocations,
      {
        movementType: "sales_reservation",
        relatedEntityType: "SalesOrder",
        relatedEntityId: orderId,
      },
      session
    );
    item.batchAllocations = toSnapshots(allocations);
    item.costPerKg = weightedCostPerKg(allocations, item.quantityKg);
    return;
  }

  if (item.itemType === "recipe") {
    const componentAllocations: RecipeComponentAllocation[] = [];
    let totalCost = 0;

    for (const component of item.recipeComponents) {
      const requiredKg = (component.gramsPerKg / 1000) * item.quantityKg;
      const allocations = await allocateFifo(component.rawMaterialId, requiredKg, session);
      await reserveAllocations(
        allocations,
        {
          movementType: "sales_reservation",
          relatedEntityType: "SalesOrder",
          relatedEntityId: orderId,
        },
        session
      );

      componentAllocations.push({
        rawMaterialId: component.rawMaterialId,
        rawMaterialCode: component.rawMaterialCode,
        rawMaterialName: component.rawMaterialName,
        allocations: toSnapshots(allocations),
      });

      totalCost += allocations.reduce(
        (sum, allocation) => sum + allocation.quantityKg * allocation.unitCostPerKg,
        0
      );
    }

    item.recipeComponentAllocations = componentAllocations;
    item.costPerKg = item.quantityKg > 0 ? totalCost / item.quantityKg : 0;
    return;
  }

  // returned_mix: reserved directly from ReturnedMixBatch, no raw material is touched
  const recipeId = requireRecipeId(item);
  const allocations = await allocateReturnedMixFifo(recipeId, item.quantityKg, session);
  await reserveReturnedMix(allocations, session);
  item.returnedMixAllocations = toReturnedMixSnapshots(allocations);
  item.costPerKg = returnedMixWeightedCostPerKg(allocations, item.quantityKg);
}

export async function confirmSalesOrder(id: string) {
  return withTransaction(async (session) => {
    const order = await SalesOrderModel.findById(id).session(session);
    if (!order) {
      throw new AppError("أمر البيع غير موجود", 404);
    }
    if (order.status !== "draft") {
      throw new AppError("لا يمكن تأكيد أمر بيع ليس في حالة مسودة", 409);
    }

    for (const item of order.items) {
      await reserveItem(item, order._id, session);
    }

    order.status = "confirmed";
    await order.save({ session });
    return order;
  });
}

async function releaseItem(
  item: SalesOrderItemAttrs,
  orderId: Types.ObjectId,
  session: ClientSession
): Promise<void> {
  const context = {
    movementType: "sales_reservation_release" as const,
    relatedEntityType: "SalesOrder",
    relatedEntityId: orderId,
  };

  if (item.itemType === "raw_material") {
    const rawMaterialId = requireRawMaterialId(item);
    await releaseAllocations(toBatchAllocations(item.batchAllocations, rawMaterialId), context, session);
    return;
  }

  if (item.itemType === "recipe") {
    for (const component of item.recipeComponentAllocations) {
      await releaseAllocations(
        toBatchAllocations(component.allocations, component.rawMaterialId),
        context,
        session
      );
    }
    return;
  }

  await releaseReturnedMix(toReturnedMixAllocations(item.returnedMixAllocations), session);
}

async function issueItem(
  item: SalesOrderItemAttrs,
  orderId: Types.ObjectId,
  session: ClientSession
): Promise<void> {
  const context = {
    movementType: "sales_issue" as const,
    relatedEntityType: "SalesOrder",
    relatedEntityId: orderId,
  };

  if (item.itemType === "raw_material") {
    const rawMaterialId = requireRawMaterialId(item);
    await issueAllocations(toBatchAllocations(item.batchAllocations, rawMaterialId), context, session);
    return;
  }

  if (item.itemType === "recipe") {
    for (const component of item.recipeComponentAllocations) {
      await issueAllocations(
        toBatchAllocations(component.allocations, component.rawMaterialId),
        context,
        session
      );
    }
    return;
  }

  await issueReturnedMix(
    toReturnedMixAllocations(item.returnedMixAllocations),
    { relatedEntityType: "SalesOrder", relatedEntityId: orderId },
    session
  );
}

export async function deliverSalesOrder(id: string) {
  return withTransaction(async (session) => {
    const order = await SalesOrderModel.findById(id).session(session);
    if (!order) {
      throw new AppError("أمر البيع غير موجود", 404);
    }
    if (order.status !== "confirmed") {
      throw new AppError("لا يمكن تسليم أمر بيع لم يتم تأكيده", 409);
    }

    for (const item of order.items) {
      await issueItem(item, order._id, session);
    }

    const customerBefore = await CustomerModel.findOneAndUpdate(
      { _id: order.customerId },
      { $inc: { balance: order.totalAmount } },
      { session, returnDocument: "before" }
    );
    if (!customerBefore) {
      throw new AppError("العميل غير موجود", 404);
    }

    const previousBalance = customerBefore.balance;
    const currentBalance = previousBalance + order.totalAmount;

    const invoiceNumber = await getNextSequenceNumber("SI", { session });
    const invoiceDate = new Date();

    const [invoice] = await SalesInvoiceModel.create(
      [
        {
          invoiceNumber,
          salesOrderId: order._id,
          salesOrderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
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
      throw new AppError("تعذر إنشاء فاتورة البيع", 500);
    }

    await recordLedgerEntry(
      {
        partyType: "customer",
        partyId: order.customerId,
        date: invoiceDate,
        sourceType: "sales_invoice",
        sourceId: invoice._id,
        description: `فاتورة بيع ${invoiceNumber}`,
        debit: order.totalAmount,
        credit: 0,
      },
      session
    );

    order.status = "delivered";
    order.deliveredDate = invoiceDate;
    await order.save({ session });

    return { order, invoice };
  });
}

export async function cancelSalesOrder(id: string, cancellationReason: string) {
  return withTransaction(async (session) => {
    const order = await SalesOrderModel.findById(id).session(session);
    if (!order) {
      throw new AppError("أمر البيع غير موجود", 404);
    }
    if (order.status === "delivered") {
      throw new AppError("لا يمكن إلغاء أمر بيع تم تسليمه", 409);
    }
    if (order.status === "cancelled") {
      throw new AppError("أمر البيع ملغى بالفعل", 409);
    }

    if (order.status === "confirmed") {
      for (const item of order.items) {
        await releaseItem(item, order._id, session);
      }
    }

    order.status = "cancelled";
    order.cancellationReason = cancellationReason;
    order.cancelledAt = new Date();
    await order.save({ session });
    return order;
  });
}

export async function getSalesOrderById(id: string) {
  const order = await SalesOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر البيع غير موجود", 404);
  }
  return order;
}

interface ListSalesOrdersOptions {
  customerId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listSalesOrders(options: ListSalesOrdersOptions) {
  const filter: Record<string, unknown> = {};
  if (options.customerId) filter.customerId = options.customerId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    SalesOrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    SalesOrderModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
