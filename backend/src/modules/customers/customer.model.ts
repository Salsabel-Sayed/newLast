import { Schema, model } from "mongoose";

export interface CustomerAttrs {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  openingBalanceAmount?: number;
  openingBalanceSide?: "they_owe_us" | "we_owe_them";
  openingBalanceDate?: Date;
  isActive: boolean;
  notes?: string;
}

const customerSchema = new Schema<CustomerAttrs>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    balance: { type: Number, required: true, default: 0 },
    openingBalanceAmount: { type: Number, min: 0 },
    openingBalanceSide: { type: String, enum: ["they_owe_us", "we_owe_them"] },
    openingBalanceDate: { type: Date },
    isActive: { type: Boolean, required: true, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

customerSchema.index({ name: 1 });
customerSchema.index({ isActive: 1 });

export const CustomerModel = model<CustomerAttrs>("Customer", customerSchema);
