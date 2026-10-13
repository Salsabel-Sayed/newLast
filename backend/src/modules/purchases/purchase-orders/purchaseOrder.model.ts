import { Schema, model, Types } from "mongoose";
import { PACKAGE_TYPES, type PackageType } from "../../../shared/constants/packageTypes.js";

export const PURCHASE_ORDER_STATUSES = ["draft", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export interface PurchaseOrderItemAttrs {
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
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

export interface PurchaseOrderAttrs {
  orderNumber: string;
  supplierId: Types.ObjectId;
  supplierName: string;
  purchaseDate: Date;
  items: PurchaseOrderItemAttrs[];
  totalKg: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
}

const purchaseOrderItemSchema = new Schema<PurchaseOrderItemAttrs>(
  {
    rawMaterialId: {
      type: Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    rawMaterialName: { type: String, required: true },
    rawMaterialCode: { type: String, required: true },
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

const purchaseOrderSchema = new Schema<PurchaseOrderAttrs>(
  {
    orderNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    items: {
      type: [purchaseOrderItemSchema],
      required: true,
      validate: {
        validator: (items: PurchaseOrderItemAttrs[]) => items.length > 0,
        message: "يجب أن يحتوي أمر الشراء على سطر واحد على الأقل",
      },
    },
    totalKg: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: PURCHASE_ORDER_STATUSES,
      required: true,
      default: "draft",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ status: 1 });

export const PurchaseOrderModel = model<PurchaseOrderAttrs>(
  "PurchaseOrder",
  purchaseOrderSchema
);
