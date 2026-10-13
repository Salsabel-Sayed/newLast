import { Schema, model, Types } from "mongoose";
import { PACKAGE_TYPES, type PackageType } from "../../../shared/constants/packageTypes.js";

export const PURCHASE_INVOICE_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PurchaseInvoiceStatus = (typeof PURCHASE_INVOICE_STATUSES)[number];

export interface PurchaseInvoiceItemSnapshot {
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

export interface PurchaseInvoiceAttrs {
  invoiceNumber: string;
  purchaseOrderId: Types.ObjectId;
  purchaseOrderNumber: string;
  supplierId: Types.ObjectId;
  supplierName: string;
  invoiceDate: Date;
  itemsSnapshot: PurchaseInvoiceItemSnapshot[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  previousBalance: number;
  currentBalance: number;
  status: PurchaseInvoiceStatus;
}

const purchaseInvoiceItemSchema = new Schema<PurchaseInvoiceItemSnapshot>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialName: { type: String, required: true },
    rawMaterialCode: { type: String, required: true },
    packageType: { type: String, enum: PACKAGE_TYPES, required: true },
    customPackageName: { type: String },
    packageCount: { type: Number, required: true },
    kgPerPackage: { type: Number, required: true },
    totalKg: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    unitCostPerKg: { type: Number, required: true },
    productionDate: { type: Date },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
  },
  { _id: false }
);

const purchaseInvoiceSchema = new Schema<PurchaseInvoiceAttrs>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    purchaseOrderNumber: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    itemsSnapshot: { type: [purchaseInvoiceItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    previousBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    status: {
      type: String,
      enum: PURCHASE_INVOICE_STATUSES,
      required: true,
      default: "unpaid",
    },
  },
  { timestamps: true }
);

purchaseInvoiceSchema.index({ supplierId: 1 });
purchaseInvoiceSchema.index({ purchaseOrderId: 1 });

export const PurchaseInvoiceModel = model<PurchaseInvoiceAttrs>(
  "PurchaseInvoice",
  purchaseInvoiceSchema
);
