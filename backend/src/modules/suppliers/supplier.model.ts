import { Schema, model } from "mongoose";

export interface SupplierAttrs {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  isActive: boolean;
  notes?: string;
}

const supplierSchema = new Schema<SupplierAttrs>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    balance: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ isActive: 1 });

export const SupplierModel = model<SupplierAttrs>("Supplier", supplierSchema);
