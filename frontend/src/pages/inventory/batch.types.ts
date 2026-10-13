export interface Batch {
  _id: string;
  batchCode: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  supplierId?: string;
  source: "opening_balance" | "purchase" | "sales_return";
  originalQty: number;
  remainingQty: number;
  reservedQty: number;
  unitCostPerKg: number;
  productionDate?: string;
  purchaseDate: string;
  depletedAt?: string;
  purchaseOrderId?: string;
  sourceReturnId?: string;
  status: "active" | "depleted" | "locked";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const BATCH_SOURCE_LABELS: Record<Batch["source"], string> = {
  opening_balance: "رصيد افتتاحي",
  purchase: "شراء",
  sales_return: "مرتجع بيع",
};
