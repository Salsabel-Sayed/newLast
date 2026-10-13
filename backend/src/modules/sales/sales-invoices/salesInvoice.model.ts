import { Schema, model, Types } from "mongoose";
import {
  SALES_ORDER_ITEM_TYPES,
  type SalesOrderItemType,
} from "../sales-orders/salesOrder.model.js";

export const SALES_INVOICE_STATUSES = ["unpaid", "partial", "paid"] as const;
export type SalesInvoiceStatus = (typeof SALES_INVOICE_STATUSES)[number];

interface BatchAllocationSnapshot {
  batchId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

interface RecipeComponentSnapshot {
  rawMaterialId: Types.ObjectId;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
}

interface RecipeComponentAllocationSnapshot {
  rawMaterialId: Types.ObjectId;
  rawMaterialCode: string;
  rawMaterialName: string;
  allocations: BatchAllocationSnapshot[];
}

interface ReturnedMixAllocationSnapshot {
  returnedMixBatchId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

export interface SalesInvoiceItemSnapshot {
  itemType: SalesOrderItemType;
  rawMaterialId?: Types.ObjectId;
  rawMaterialName?: string;
  rawMaterialCode?: string;
  recipeId?: Types.ObjectId;
  recipeName?: string;
  recipeCode?: string;
  quantityKg: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount: number;
  batchAllocations: BatchAllocationSnapshot[];
  recipeComponents: RecipeComponentSnapshot[];
  recipeComponentAllocations: RecipeComponentAllocationSnapshot[];
  returnedMixAllocations: ReturnedMixAllocationSnapshot[];
  costPerKg: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface SalesInvoiceAttrs {
  invoiceNumber: string;
  salesOrderId: Types.ObjectId;
  salesOrderNumber: string;
  customerId: Types.ObjectId;
  customerName: string;
  invoiceDate: Date;
  itemsSnapshot: SalesInvoiceItemSnapshot[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  previousBalance: number;
  currentBalance: number;
  totalReturns?: number;
  status: SalesInvoiceStatus;
}

const batchAllocationSchema = new Schema<BatchAllocationSnapshot>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    quantityKg: { type: Number, required: true },
    unitCostPerKg: { type: Number, required: true },
  },
  { _id: false }
);

const recipeComponentSchema = new Schema<RecipeComponentSnapshot>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialCode: { type: String, required: true },
    rawMaterialName: { type: String, required: true },
    gramsPerKg: { type: Number, required: true },
  },
  { _id: false }
);

const recipeComponentAllocationSchema = new Schema<RecipeComponentAllocationSnapshot>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialCode: { type: String, required: true },
    rawMaterialName: { type: String, required: true },
    allocations: { type: [batchAllocationSchema], required: true },
  },
  { _id: false }
);

const returnedMixAllocationSchema = new Schema<ReturnedMixAllocationSnapshot>(
  {
    returnedMixBatchId: {
      type: Schema.Types.ObjectId,
      ref: "ReturnedMixBatch",
      required: true,
    },
    quantityKg: { type: Number, required: true },
    unitCostPerKg: { type: Number, required: true },
  },
  { _id: false }
);

const salesInvoiceItemSchema = new Schema<SalesInvoiceItemSnapshot>(
  {
    itemType: { type: String, enum: SALES_ORDER_ITEM_TYPES, required: true },
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    rawMaterialName: { type: String },
    rawMaterialCode: { type: String },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    recipeName: { type: String },
    recipeCode: { type: String },
    quantityKg: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discountPercent: { type: Number },
    discountAmount: { type: Number, required: true },
    batchAllocations: { type: [batchAllocationSchema], required: true },
    recipeComponents: { type: [recipeComponentSchema], required: true },
    recipeComponentAllocations: {
      type: [recipeComponentAllocationSchema],
      required: true,
    },
    returnedMixAllocations: {
      type: [returnedMixAllocationSchema],
      required: true,
    },
    costPerKg: { type: Number, required: true },
    lineSubtotal: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const salesInvoiceSchema = new Schema<SalesInvoiceAttrs>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    salesOrderId: { type: Schema.Types.ObjectId, ref: "SalesOrder", required: true },
    salesOrderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerName: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    itemsSnapshot: { type: [salesInvoiceItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    previousBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    totalReturns: { type: Number, min: 0 },
    status: {
      type: String,
      enum: SALES_INVOICE_STATUSES,
      required: true,
      default: "unpaid",
    },
  },
  { timestamps: true }
);

salesInvoiceSchema.index({ customerId: 1 });
salesInvoiceSchema.index({ salesOrderId: 1 });

export const SalesInvoiceModel = model<SalesInvoiceAttrs>(
  "SalesInvoice",
  salesInvoiceSchema
);
