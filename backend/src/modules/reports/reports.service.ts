import { Types } from "mongoose";
import { buildDateRangeFilter, type DateRangeOptions } from "../../shared/http/dateRange.js";
import { SalesInvoiceModel } from "../sales/sales-invoices/salesInvoice.model.js";
import { PurchaseInvoiceModel } from "../purchases/purchase-invoices/purchaseInvoice.model.js";
import { ExpenseModel } from "../finance/expenses/expense.model.js";
import { PaymentModel } from "../finance/payments/payment.model.js";
import { BatchModel } from "../inventory/batches/batch.model.js";
import { RawMaterialModel } from "../inventory/raw-materials/rawMaterial.model.js";
import { listLowStockRawMaterials } from "../inventory/raw-materials/rawMaterial.service.js";
import { ReturnedMixBatchModel } from "../returns/returned-mixes/returnedMixBatch.model.js";
import { StockMovementModel } from "../inventory/stock-movements/stockMovement.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------- Sales / Purchases / Expenses / Collections / Payments ----------

export async function getSalesReport(options: DateRangeOptions & { customerId?: string }) {
  const filter: Record<string, unknown> = {
    ...buildDateRangeFilter("invoiceDate", options),
  };
  if (options.customerId) filter.customerId = options.customerId;

  const invoices = await SalesInvoiceModel.find(filter);

  const total = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const byPeriod = new Map<string, number>();
  const byCustomer = new Map<string, { name: string; amount: number }>();
  const byItem = new Map<string, { name: string; qty: number; amount: number }>();

  for (const invoice of invoices) {
    const day = dayKey(invoice.invoiceDate);
    byPeriod.set(day, (byPeriod.get(day) ?? 0) + invoice.totalAmount);

    const customerKey = invoice.customerId.toString();
    const customerEntry = byCustomer.get(customerKey) ?? {
      name: invoice.customerName,
      amount: 0,
    };
    customerEntry.amount += invoice.totalAmount;
    byCustomer.set(customerKey, customerEntry);

    for (const item of invoice.itemsSnapshot) {
      const itemId =
        item.itemType === "raw_material"
          ? item.rawMaterialId?.toString()
          : item.recipeId?.toString();
      if (!itemId) continue;
      const itemName =
        item.itemType === "raw_material" ? item.rawMaterialName : item.recipeName;
      const entry = byItem.get(itemId) ?? { name: itemName ?? "", qty: 0, amount: 0 };
      entry.qty += item.quantityKg;
      entry.amount += item.lineTotal;
      byItem.set(itemId, entry);
    }
  }

  return {
    total,
    byPeriod: [...byPeriod.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCustomer: [...byCustomer.entries()].map(([customerId, v]) => ({ customerId, ...v })),
    byItem: [...byItem.entries()].map(([itemId, v]) => ({ itemId, ...v })),
  };
}

export async function getPurchasesReport(options: DateRangeOptions & { supplierId?: string }) {
  const filter: Record<string, unknown> = {
    ...buildDateRangeFilter("invoiceDate", options),
  };
  if (options.supplierId) filter.supplierId = options.supplierId;

  const invoices = await PurchaseInvoiceModel.find(filter);

  const total = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const byPeriod = new Map<string, number>();
  const bySupplier = new Map<string, { name: string; amount: number }>();
  const byItem = new Map<string, { name: string; qty: number; amount: number }>();

  for (const invoice of invoices) {
    const day = dayKey(invoice.invoiceDate);
    byPeriod.set(day, (byPeriod.get(day) ?? 0) + invoice.totalAmount);

    const supplierKey = invoice.supplierId.toString();
    const supplierEntry = bySupplier.get(supplierKey) ?? {
      name: invoice.supplierName,
      amount: 0,
    };
    supplierEntry.amount += invoice.totalAmount;
    bySupplier.set(supplierKey, supplierEntry);

    for (const item of invoice.itemsSnapshot) {
      const itemId = item.rawMaterialId.toString();
      const entry = byItem.get(itemId) ?? { name: item.rawMaterialName, qty: 0, amount: 0 };
      entry.qty += item.totalKg;
      entry.amount += item.totalCost;
      byItem.set(itemId, entry);
    }
  }

  return {
    total,
    byPeriod: [...byPeriod.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    bySupplier: [...bySupplier.entries()].map(([supplierId, v]) => ({ supplierId, ...v })),
    byItem: [...byItem.entries()].map(([itemId, v]) => ({ itemId, ...v })),
  };
}

export async function getExpensesReport(options: DateRangeOptions & { category?: string }) {
  const filter: Record<string, unknown> = {
    ...buildDateRangeFilter("expenseDate", options),
  };
  if (options.category) filter.category = options.category;

  const expenses = await ExpenseModel.find(filter);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const byPeriod = new Map<string, number>();
  const byCategory = new Map<string, number>();

  for (const expense of expenses) {
    const day = dayKey(expense.expenseDate);
    byPeriod.set(day, (byPeriod.get(day) ?? 0) + expense.amount);
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
  }

  return {
    total,
    byPeriod: [...byPeriod.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })),
  };
}

export async function getCollectionsReport(options: DateRangeOptions & { customerId?: string }) {
  const filter: Record<string, unknown> = {
    direction: "collection",
    status: "completed",
    ...buildDateRangeFilter("paymentDate", options),
  };
  if (options.customerId) filter.customerId = options.customerId;

  const payments = await PaymentModel.find(filter);

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const byPeriod = new Map<string, number>();
  const byCustomer = new Map<string, { name: string; amount: number }>();

  for (const payment of payments) {
    const day = dayKey(payment.paymentDate);
    byPeriod.set(day, (byPeriod.get(day) ?? 0) + payment.amount);

    const customerKey = (payment.customerId ?? new Types.ObjectId()).toString();
    const entry = byCustomer.get(customerKey) ?? {
      name: payment.customerName ?? "",
      amount: 0,
    };
    entry.amount += payment.amount;
    byCustomer.set(customerKey, entry);
  }

  return {
    total,
    byPeriod: [...byPeriod.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCustomer: [...byCustomer.entries()].map(([customerId, v]) => ({ customerId, ...v })),
  };
}

export async function getPaymentsReport(options: DateRangeOptions & { supplierId?: string }) {
  const filter: Record<string, unknown> = {
    direction: "payment",
    status: "completed",
    ...buildDateRangeFilter("paymentDate", options),
  };
  if (options.supplierId) filter.supplierId = options.supplierId;

  const payments = await PaymentModel.find(filter);

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const byPeriod = new Map<string, number>();
  const bySupplier = new Map<string, { name: string; amount: number }>();

  for (const payment of payments) {
    const day = dayKey(payment.paymentDate);
    byPeriod.set(day, (byPeriod.get(day) ?? 0) + payment.amount);

    const supplierKey = (payment.supplierId ?? new Types.ObjectId()).toString();
    const entry = bySupplier.get(supplierKey) ?? {
      name: payment.supplierName ?? "",
      amount: 0,
    };
    entry.amount += payment.amount;
    bySupplier.set(supplierKey, entry);
  }

  return {
    total,
    byPeriod: [...byPeriod.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    bySupplier: [...bySupplier.entries()].map(([supplierId, v]) => ({ supplierId, ...v })),
  };
}

// ---------- Profit ----------

export async function getProfitReport(options: DateRangeOptions) {
  const salesFilter = buildDateRangeFilter("invoiceDate", options);
  const expenseFilter = buildDateRangeFilter("expenseDate", options);

  const [invoices, expenses] = await Promise.all([
    SalesInvoiceModel.find(salesFilter),
    ExpenseModel.find(expenseFilter),
  ]);

  const byPeriod = new Map<string, { revenue: number; cost: number; expenses: number }>();

  let revenue = 0;
  let cost = 0;

  for (const invoice of invoices) {
    const day = dayKey(invoice.invoiceDate);
    const entry = byPeriod.get(day) ?? { revenue: 0, cost: 0, expenses: 0 };
    entry.revenue += invoice.totalAmount;
    const invoiceCost = invoice.itemsSnapshot.reduce(
      (sum, item) => sum + item.quantityKg * item.costPerKg,
      0
    );
    entry.cost += invoiceCost;
    byPeriod.set(day, entry);

    revenue += invoice.totalAmount;
    cost += invoiceCost;
  }

  let totalExpenses = 0;
  for (const expense of expenses) {
    const day = dayKey(expense.expenseDate);
    const entry = byPeriod.get(day) ?? { revenue: 0, cost: 0, expenses: 0 };
    entry.expenses += expense.amount;
    byPeriod.set(day, entry);
    totalExpenses += expense.amount;
  }

  return {
    revenue,
    cost,
    expenses: totalExpenses,
    profit: revenue - cost - totalExpenses,
    byPeriod: [...byPeriod.entries()]
      .map(([date, v]) => ({ date, ...v, profit: v.revenue - v.cost - v.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---------- Top N ----------

export async function getTopRawMaterialsReport(options: DateRangeOptions & { limit: number }) {
  const filter = buildDateRangeFilter("invoiceDate", options);
  const invoices = await SalesInvoiceModel.find(filter);

  const byMaterial = new Map<string, { name: string; qty: number; amount: number }>();

  for (const invoice of invoices) {
    for (const item of invoice.itemsSnapshot) {
      if (item.itemType !== "raw_material" || !item.rawMaterialId) continue;
      const key = item.rawMaterialId.toString();
      const entry = byMaterial.get(key) ?? { name: item.rawMaterialName ?? "", qty: 0, amount: 0 };
      entry.qty += item.quantityKg;
      entry.amount += item.lineTotal;
      byMaterial.set(key, entry);
    }
  }

  return [...byMaterial.entries()]
    .map(([rawMaterialId, v]) => ({ rawMaterialId, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, options.limit);
}

export async function getTopRecipesReport(options: DateRangeOptions & { limit: number }) {
  const filter = buildDateRangeFilter("invoiceDate", options);
  const invoices = await SalesInvoiceModel.find(filter);

  const byRecipe = new Map<string, { name: string; qty: number; amount: number }>();

  for (const invoice of invoices) {
    for (const item of invoice.itemsSnapshot) {
      if (item.itemType !== "recipe" && item.itemType !== "returned_mix") continue;
      if (!item.recipeId) continue;
      const key = item.recipeId.toString();
      const entry = byRecipe.get(key) ?? { name: item.recipeName ?? "", qty: 0, amount: 0 };
      entry.qty += item.quantityKg;
      entry.amount += item.lineTotal;
      byRecipe.set(key, entry);
    }
  }

  return [...byRecipe.entries()]
    .map(([recipeId, v]) => ({ recipeId, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, options.limit);
}

export async function getTopCustomersReport(options: DateRangeOptions & { limit: number }) {
  const filter = buildDateRangeFilter("invoiceDate", options);
  const invoices = await SalesInvoiceModel.find(filter);

  const byCustomer = new Map<string, { name: string; amount: number; invoiceCount: number }>();

  for (const invoice of invoices) {
    const key = invoice.customerId.toString();
    const entry = byCustomer.get(key) ?? {
      name: invoice.customerName,
      amount: 0,
      invoiceCount: 0,
    };
    entry.amount += invoice.totalAmount;
    entry.invoiceCount += 1;
    byCustomer.set(key, entry);
  }

  return [...byCustomer.entries()]
    .map(([customerId, v]) => ({ customerId, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, options.limit);
}

export async function getTopSuppliersReport(options: DateRangeOptions & { limit: number }) {
  const filter = buildDateRangeFilter("invoiceDate", options);
  const invoices = await PurchaseInvoiceModel.find(filter);

  const bySupplier = new Map<string, { name: string; amount: number; invoiceCount: number }>();

  for (const invoice of invoices) {
    const key = invoice.supplierId.toString();
    const entry = bySupplier.get(key) ?? {
      name: invoice.supplierName,
      amount: 0,
      invoiceCount: 0,
    };
    entry.amount += invoice.totalAmount;
    entry.invoiceCount += 1;
    bySupplier.set(key, entry);
  }

  return [...bySupplier.entries()]
    .map(([supplierId, v]) => ({ supplierId, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, options.limit);
}

// ---------- Stock ----------

interface StockBreakdownBatch {
  batchId: string;
  batchCode: string;
  purchaseDate: Date;
  remainingQty: number;
  reservedQty: number;
  availableQty: number;
  unitCostPerKg: number;
}

interface StockBreakdownEntry {
  rawMaterialId: string;
  code: string;
  name: string;
  minStockLevel: number;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  averageCostPerKg: number;
  batches: StockBreakdownBatch[];
}

async function getStockBreakdown(): Promise<StockBreakdownEntry[]> {
  const [rawMaterials, batches] = await Promise.all([
    RawMaterialModel.find({}),
    BatchModel.find({ status: "active" }).sort({ purchaseDate: 1 }),
  ]);

  const batchesByMaterial = new Map<string, StockBreakdownBatch[]>();
  for (const batch of batches) {
    const key = batch.rawMaterialId.toString();
    const list = batchesByMaterial.get(key) ?? [];
    list.push({
      batchId: batch.id,
      batchCode: batch.batchCode,
      purchaseDate: batch.purchaseDate,
      remainingQty: batch.remainingQty,
      reservedQty: batch.reservedQty,
      availableQty: batch.remainingQty - batch.reservedQty,
      unitCostPerKg: batch.unitCostPerKg,
    });
    batchesByMaterial.set(key, list);
  }

  return rawMaterials.map((rawMaterial) => {
    const materialBatches = batchesByMaterial.get(rawMaterial.id) ?? [];
    const totalQuantity = materialBatches.reduce((sum, b) => sum + b.remainingQty, 0);
    const reservedQuantity = materialBatches.reduce((sum, b) => sum + b.reservedQty, 0);
    const inventoryValue = materialBatches.reduce(
      (sum, b) => sum + b.remainingQty * b.unitCostPerKg,
      0
    );

    return {
      rawMaterialId: rawMaterial.id,
      code: rawMaterial.code,
      name: rawMaterial.name,
      minStockLevel: rawMaterial.minStockLevel,
      totalQuantity,
      reservedQuantity,
      availableQuantity: totalQuantity - reservedQuantity,
      inventoryValue,
      averageCostPerKg: totalQuantity > 0 ? inventoryValue / totalQuantity : 0,
      batches: materialBatches,
    };
  });
}

export async function getCurrentStockReport() {
  return getStockBreakdown();
}

export async function getReservedStockReport() {
  const breakdown = await getStockBreakdown();
  return breakdown
    .filter((entry) => entry.reservedQuantity > 0)
    .map((entry) => ({
      rawMaterialId: entry.rawMaterialId,
      code: entry.code,
      name: entry.name,
      reservedQuantity: entry.reservedQuantity,
      batches: entry.batches
        .filter((b) => b.reservedQty > 0)
        .map((b) => ({ batchId: b.batchId, batchCode: b.batchCode, reservedQty: b.reservedQty })),
    }));
}

export async function getAvailableStockReport() {
  const breakdown = await getStockBreakdown();
  return breakdown.map((entry) => ({
    rawMaterialId: entry.rawMaterialId,
    code: entry.code,
    name: entry.name,
    availableQuantity: entry.availableQuantity,
    batches: entry.batches.map((b) => ({
      batchId: b.batchId,
      batchCode: b.batchCode,
      availableQty: b.availableQty,
    })),
  }));
}

export async function getLowStockReport() {
  return listLowStockRawMaterials();
}

export async function getFifoValuationReport() {
  const batches = await BatchModel.find({ status: "active" }).sort({ purchaseDate: 1 });

  const items = batches.map((batch) => ({
    batchId: batch.id,
    batchCode: batch.batchCode,
    rawMaterialId: batch.rawMaterialId.toString(),
    rawMaterialName: batch.rawMaterialName,
    purchaseDate: batch.purchaseDate,
    remainingQty: batch.remainingQty,
    unitCostPerKg: batch.unitCostPerKg,
    value: batch.remainingQty * batch.unitCostPerKg,
  }));

  return {
    items,
    totalValue: items.reduce((sum, item) => sum + item.value, 0),
  };
}

// ---------- Returned mix ----------

export async function getReturnedMixReport(options: { recipeId?: string }) {
  const filter: Record<string, unknown> = {};
  if (options.recipeId) filter.recipeId = options.recipeId;

  const batches = await ReturnedMixBatchModel.find(filter);

  // "returned_mix_out" covers two distinct causes, told apart only by relatedEntityType:
  // sold in a SalesOrder, or written off via the /loss endpoint (relatedEntityType=ReturnedMixBatch).
  const outMovements = await StockMovementModel.find({
    movementType: "returned_mix_out",
    returnedMixBatchId: { $in: batches.map((b) => b._id) },
  });

  const soldByBatch = new Map<string, number>();
  const lossAfterTheFactByBatch = new Map<string, number>();
  for (const movement of outMovements) {
    if (!movement.returnedMixBatchId) continue;
    const key = movement.returnedMixBatchId.toString();
    const target =
      movement.relatedEntityType === "ReturnedMixBatch" ? lossAfterTheFactByBatch : soldByBatch;
    target.set(key, (target.get(key) ?? 0) + movement.quantityKg);
  }

  const byRecipe = new Map<
    string,
    { name: string; available: number; sold: number; losses: number }
  >();

  for (const batch of batches) {
    const key = batch.recipeId.toString();
    const entry = byRecipe.get(key) ?? { name: batch.recipeName, available: 0, sold: 0, losses: 0 };
    entry.available += batch.remainingQty;
    entry.sold += soldByBatch.get(batch.id) ?? 0;
    entry.losses += lossAfterTheFactByBatch.get(batch.id) ?? 0;
    byRecipe.set(key, entry);
  }

  // Losses chosen at return time (disposition=dispose) never create a ReturnedMixBatch at
  // all per §4.13 ("لا تُضاف إلى أي مخزون"), so they must be pulled from Return.items directly.
  const disposeReturnFilter: Record<string, unknown> = {
    returnType: "sales_recipe",
    "items.disposition": "dispose",
  };
  if (options.recipeId) disposeReturnFilter["items.recipeId"] = options.recipeId;

  const disposeReturns = await ReturnModel.find(disposeReturnFilter);
  for (const returnDoc of disposeReturns) {
    for (const item of returnDoc.items) {
      if (item.disposition !== "dispose" || !item.recipeId) continue;
      const key = item.recipeId.toString();
      const entry = byRecipe.get(key) ?? { name: item.recipeName ?? "", available: 0, sold: 0, losses: 0 };
      entry.losses += item.quantityKg;
      byRecipe.set(key, entry);
    }
  }

  return [...byRecipe.entries()].map(([recipeId, v]) => ({ recipeId, ...v }));
}
