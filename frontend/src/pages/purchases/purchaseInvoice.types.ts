import type { PurchaseOrderItem } from "./purchaseOrder.types";

export interface PurchaseInvoice {
  _id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  itemsSnapshot: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  previousBalance: number;
  currentBalance: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
}

export const PURCHASE_INVOICE_STATUS_LABELS: Record<
  PurchaseInvoice["status"],
  { label: string; variant: "danger" | "warning" | "success" }
> = {
  unpaid: { label: "غير مدفوعة", variant: "danger" },
  partial: { label: "مدفوعة جزئيًا", variant: "warning" },
  paid: { label: "مدفوعة بالكامل", variant: "success" },
};
