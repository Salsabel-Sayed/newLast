export type PaymentDirection = "collection" | "payment";
export type PaymentMethod = "cash" | "bank_transfer" | "check" | "other";
export type PaymentStatus = "completed" | "voided";

export interface Payment {
  _id: string;
  paymentNumber: string;
  direction: PaymentDirection;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  relatedInvoiceId?: string;
  status: PaymentStatus;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  bank_transfer: "تحويل بنكي",
  check: "شيك",
  other: "أخرى",
};
