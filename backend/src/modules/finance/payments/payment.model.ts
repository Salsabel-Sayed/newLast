import { Schema, model, Types } from "mongoose";

export const PAYMENT_DIRECTIONS = ["collection", "payment"] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "check", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["completed", "voided"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentAttrs {
  paymentNumber: string;
  direction: PaymentDirection;
  customerId?: Types.ObjectId;
  customerName?: string;
  supplierId?: Types.ObjectId;
  supplierName?: string;
  amount: number;
  paymentDate: Date;
  method: PaymentMethod;
  relatedInvoiceId?: Types.ObjectId;
  status: PaymentStatus;
  voidReason?: string;
}

const paymentSchema = new Schema<PaymentAttrs>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    direction: { type: String, enum: PAYMENT_DIRECTIONS, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    relatedInvoiceId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: "completed",
    },
    voidReason: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ direction: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ supplierId: 1 });

export const PaymentModel = model<PaymentAttrs>("Payment", paymentSchema);
