export type SalesOrderItemType = "raw_material" | "recipe" | "returned_mix";
export type DeliveryMethod = "pickup" | "delivery" | "shipping_company";
export type SalesOrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

export interface BatchAllocationSnapshot {
  batchId: string;
  quantityKg: number;
  unitCostPerKg: number;
}

export interface RecipeComponentSnapshot {
  rawMaterialId: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
}

export interface RecipeComponentAllocation {
  rawMaterialId: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  allocations: BatchAllocationSnapshot[];
}

export interface ReturnedMixAllocationSnapshot {
  returnedMixBatchId: string;
  quantityKg: number;
  unitCostPerKg: number;
}

export interface SalesOrderItem {
  itemType: SalesOrderItemType;
  rawMaterialId?: string;
  rawMaterialName?: string;
  rawMaterialCode?: string;
  recipeId?: string;
  recipeName?: string;
  recipeCode?: string;
  quantityKg: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount: number;
  batchAllocations: BatchAllocationSnapshot[];
  recipeComponents: RecipeComponentSnapshot[];
  recipeComponentAllocations: RecipeComponentAllocation[];
  returnedMixAllocations: ReturnedMixAllocationSnapshot[];
  costPerKg: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface SalesOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;
  deliveryMethod: DeliveryMethod;
  status: SalesOrderStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  items: SalesOrderItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderItemFormRow {
  key: string;
  itemType: SalesOrderItemType;
  rawMaterialId: string;
  recipeId: string;
  recipeComponents: { rawMaterialId: string; gramsPerKg: string }[];
  quantityKg: string;
  unitPrice: string;
  discountMode: "none" | "percent" | "amount";
  discountValue: string;
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  pickup: "استلام من المتجر",
  delivery: "توصيل",
  shipping_company: "شركة شحن",
};

export const SALES_ORDER_STATUS_LABELS: Record<
  SalesOrderStatus,
  { label: string; variant: "secondary" | "info" | "success" | "danger" }
> = {
  draft: { label: "مسودة", variant: "secondary" },
  confirmed: { label: "مؤكد", variant: "info" },
  delivered: { label: "تم التسليم", variant: "success" },
  cancelled: { label: "ملغى", variant: "danger" },
};

export const ITEM_TYPE_LABELS: Record<SalesOrderItemType, string> = {
  raw_material: "مادة خام",
  recipe: "توليفة (تصنيع عند البيع)",
  returned_mix: "توليفة مرتجعة",
};

// Actual FIFO cost is only known once an order is confirmed (batches allocated) —
// draft orders always have costPerKg=0 on every item, so the true cost is undetermined.
export function computeOrderActualCost(order: SalesOrder): number | null {
  if (order.status === "draft") return null;
  return order.items.reduce((sum, item) => sum + item.quantityKg * item.costPerKg, 0);
}
