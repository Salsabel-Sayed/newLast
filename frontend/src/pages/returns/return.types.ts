export type ReturnType = "sales_raw_material" | "sales_recipe" | "purchase_return";
export const RETURN_TYPES: ReturnType[] = ["sales_raw_material", "sales_recipe", "purchase_return"];
export type ReturnDisposition = "return_to_stock" | "dispose";

export interface ReturnItem {
  rawMaterialId?: string;
  rawMaterialName?: string;
  rawMaterialCode?: string;
  recipeId?: string;
  recipeName?: string;
  recipeCode?: string;
  disposition?: ReturnDisposition;
  returnedMixBatchId?: string;
  batchId?: string;
  batchCode?: string;
  quantityKg: number;
  unitPrice?: number;
  unitCostPerKg: number;
  lineTotal: number;
  newBatchId?: string;
}

export interface ReturnRecord {
  _id: string;
  returnNumber: string;
  returnType: ReturnType;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  salesOrderId?: string;
  purchaseOrderId?: string;
  returnDate: string;
  items: ReturnItem[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const RETURN_TYPE_LABELS: Record<ReturnType, string> = {
  sales_raw_material: "مرتجع بيع — مادة خام",
  sales_recipe: "مرتجع بيع — توليفة",
  purchase_return: "مرتجع شراء",
};

export const DISPOSITION_LABELS: Record<ReturnDisposition, string> = {
  return_to_stock: "إعادة للمخزون (منطقة التوليفات المرتجعة)",
  dispose: "إتلاف (خسارة)",
};

const RETURN_STATUS_EPSILON = 0.01;

export interface ReturnStatusMeta {
  label: string;
  variant: "warning" | "danger";
}

// Purely a display-derived status (invoices carry no stored "returned" state) —
// computed from the invoice/order total against the sum of its linked returns.
export function computeReturnStatus(totalAmount: number, totalReturnsValue: number): ReturnStatusMeta | null {
  if (totalReturnsValue <= RETURN_STATUS_EPSILON) return null;
  if (totalReturnsValue >= totalAmount - RETURN_STATUS_EPSILON) {
    return { label: "مرتجعة بالكامل", variant: "danger" };
  }
  return { label: "مرتجعة جزئيًا", variant: "warning" };
}
