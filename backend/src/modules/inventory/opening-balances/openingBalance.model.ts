import { Schema, model, Types } from "mongoose";
import { PACKAGE_TYPES, type PackageType } from "../../../shared/constants/packageTypes.js";

export const OPENING_BALANCE_STATUSES = ["draft", "posted"] as const;
export type OpeningBalanceStatus = (typeof OPENING_BALANCE_STATUSES)[number];

export interface OpeningBalanceItemAttrs {
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  supplierId?: Types.ObjectId;
  supplierName?: string;
  packageType: PackageType;
  customPackageName?: string;
  packageCount: number;
  kgPerPackage: number;
  totalKg: number;
  totalCost: number;
  unitCostPerKg: number;
  productionDate?: Date;
  batchId?: Types.ObjectId;
}

export interface OpeningBalanceAttrs {
  openingNumber: string;
  openingDate: Date;
  items: OpeningBalanceItemAttrs[];
  status: OpeningBalanceStatus;
  notes?: string;
}

const openingBalanceItemSchema = new Schema<OpeningBalanceItemAttrs>(
  {
    rawMaterialId: {
      type: Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    rawMaterialName: { type: String, required: true },
    rawMaterialCode: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String },
    packageType: { type: String, enum: PACKAGE_TYPES, required: true },
    customPackageName: { type: String },
    packageCount: { type: Number, required: true, min: 0 },
    kgPerPackage: { type: Number, required: true, min: 0 },
    totalKg: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
    productionDate: { type: Date },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
  },
  { _id: false }
);

const openingBalanceSchema = new Schema<OpeningBalanceAttrs>(
  {
    openingNumber: { type: String, required: true, unique: true },
    openingDate: { type: Date, required: true },
    items: {
      type: [openingBalanceItemSchema],
      required: true,
      validate: {
        validator: (items: OpeningBalanceItemAttrs[]) => items.length > 0,
        message: "يجب أن يحتوي الرصيد الافتتاحي على سطر واحد على الأقل",
      },
    },
    status: {
      type: String,
      enum: OPENING_BALANCE_STATUSES,
      required: true,
      default: "draft",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export const OpeningBalanceModel = model<OpeningBalanceAttrs>(
  "OpeningBalance",
  openingBalanceSchema
);
