import type { SalesOrderItem } from "./salesOrder.types";

export interface SalesInvoice {
  _id: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  itemsSnapshot: SalesOrderItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  previousBalance: number;
  currentBalance: number;
  totalReturns?: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
}

export const SALES_INVOICE_STATUS_LABELS: Record<
  SalesInvoice["status"],
  { label: string; variant: "danger" | "warning" | "success" }
> = {
  unpaid: { label: "غير مدفوعة", variant: "danger" },
  partial: { label: "مدفوعة جزئيًا", variant: "warning" },
  paid: { label: "مدفوعة بالكامل", variant: "success" },
};
