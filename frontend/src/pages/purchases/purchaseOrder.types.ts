import type { PackageType } from "../../features/inventory/packageTypes";

export interface PurchaseOrderItem {
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  packageType: PackageType;
  customPackageName?: string;
  packageCount: number;
  kgPerPackage: number;
  totalKg: number;
  totalCost: number;
  unitCostPerKg: number;
  productionDate?: string;
  batchId?: string;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  items: PurchaseOrderItem[];
  totalKg: number;
  totalAmount: number;
  status: "draft" | "received" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemFormRow {
  key: string;
  rawMaterialId: string;
  packageType: PackageType;
  customPackageName: string;
  packageCount: string;
  kgPerPackage: string;
  totalCost: string;
  productionDate: string;
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrder["status"],
  { label: string; variant: "secondary" | "success" | "danger" }
> = {
  draft: { label: "مسودة", variant: "secondary" },
  received: { label: "مستلم", variant: "success" },
  cancelled: { label: "ملغي", variant: "danger" },
};
