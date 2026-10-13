export interface PeriodAmount {
  date: string;
  amount: number;
}

export interface PartyAmount {
  name: string;
  amount: number;
}

export interface SalesReport {
  total: number;
  byPeriod: PeriodAmount[];
  byCustomer: ({ customerId: string } & PartyAmount)[];
  byItem: ({ itemId: string; name: string; qty: number; amount: number })[];
}

export interface PurchasesReport {
  total: number;
  byPeriod: PeriodAmount[];
  bySupplier: ({ supplierId: string } & PartyAmount)[];
  byItem: ({ itemId: string; name: string; qty: number; amount: number })[];
}

export interface ExpensesReport {
  total: number;
  byPeriod: PeriodAmount[];
  byCategory: { category: string; amount: number }[];
}

export interface CollectionsReport {
  total: number;
  byPeriod: PeriodAmount[];
  byCustomer: ({ customerId: string } & PartyAmount)[];
}

export interface PaymentsReport {
  total: number;
  byPeriod: PeriodAmount[];
  bySupplier: ({ supplierId: string } & PartyAmount)[];
}

export interface ProfitReport {
  revenue: number;
  cost: number;
  expenses: number;
  profit: number;
  byPeriod: { date: string; revenue: number; cost: number; expenses: number; profit: number }[];
}

export interface TopRawMaterialRow {
  rawMaterialId: string;
  name: string;
  qty: number;
  amount: number;
}

export interface TopRecipeRow {
  recipeId: string;
  name: string;
  qty: number;
  amount: number;
}

export interface TopCustomerRow {
  customerId: string;
  name: string;
  amount: number;
  invoiceCount: number;
}

export interface TopSupplierRow {
  supplierId: string;
  name: string;
  amount: number;
  invoiceCount: number;
}

export interface StockBreakdownBatch {
  batchId: string;
  batchCode: string;
  purchaseDate: string;
  remainingQty: number;
  reservedQty: number;
  availableQty: number;
  unitCostPerKg: number;
}

export interface CurrentStockRow {
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

export interface ReservedStockRow {
  rawMaterialId: string;
  code: string;
  name: string;
  reservedQuantity: number;
  batches: { batchId: string; batchCode: string; reservedQty: number }[];
}

export interface AvailableStockRow {
  rawMaterialId: string;
  code: string;
  name: string;
  availableQuantity: number;
  batches: { batchId: string; batchCode: string; availableQty: number }[];
}

export interface LowStockRow {
  _id: string;
  code: string;
  name: string;
  minStockLevel: number;
  availableQuantity: number;
  totalQuantity: number;
}

export interface FifoValuationRow {
  batchId: string;
  batchCode: string;
  rawMaterialId: string;
  rawMaterialName: string;
  purchaseDate: string;
  remainingQty: number;
  unitCostPerKg: number;
  value: number;
}

export interface FifoValuationReport {
  items: FifoValuationRow[];
  totalValue: number;
}

export interface ReturnedMixReportRow {
  recipeId: string;
  name: string;
  available: number;
  sold: number;
  losses: number;
}
