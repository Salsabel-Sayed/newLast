import { Schema, model, Types } from "mongoose";

export const RETURN_TYPES = [
  "sales_raw_material",
  "sales_recipe",
  "purchase_return",
] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

export const RETURN_DISPOSITIONS = ["return_to_stock", "dispose"] as const;
export type ReturnDisposition = (typeof RETURN_DISPOSITIONS)[number];

export interface ReturnItemAttrs {
  rawMaterialId?: Types.ObjectId;
  rawMaterialName?: string;
  rawMaterialCode?: string;
  recipeId?: Types.ObjectId;
  recipeName?: string;
  recipeCode?: string;
  disposition?: ReturnDisposition;
  returnedMixBatchId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  batchCode?: string;
  quantityKg: number;
  unitPrice?: number;
  unitCostPerKg: number;
  lineTotal: number;
  newBatchId?: Types.ObjectId;
}

export interface ReturnAttrs {
  returnNumber: string;
  returnType: ReturnType;
  customerId?: Types.ObjectId;
  customerName?: string;
  supplierId?: Types.ObjectId;
  supplierName?: string;
  salesOrderId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  returnDate: Date;
  items: ReturnItemAttrs[];
  totalAmount: number;
  notes?: string;
}

const returnItemSchema = new Schema<ReturnItemAttrs>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    rawMaterialName: { type: String },
    rawMaterialCode: { type: String },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    recipeName: { type: String },
    recipeCode: { type: String },
    disposition: { type: String, enum: RETURN_DISPOSITIONS },
    returnedMixBatchId: { type: Schema.Types.ObjectId, ref: "ReturnedMixBatch" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    batchCode: { type: String },
    quantityKg: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, min: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    newBatchId: { type: Schema.Types.ObjectId, ref: "Batch" },
  },
  { _id: false }
);

const returnSchema = new Schema<ReturnAttrs>(
  {
    returnNumber: { type: String, required: true, unique: true },
    returnType: { type: String, enum: RETURN_TYPES, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String },
    salesOrderId: { type: Schema.Types.ObjectId, ref: "SalesOrder" },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    returnDate: { type: Date, required: true },
    items: {
      type: [returnItemSchema],
      required: true,
      validate: {
        validator: (items: ReturnItemAttrs[]) => items.length > 0,
        message: "يجب أن يحتوي المرتجع على سطر واحد على الأقل",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

returnSchema.index({ returnType: 1 });
returnSchema.index({ customerId: 1 });
returnSchema.index({ supplierId: 1 });
returnSchema.index({ salesOrderId: 1 });
returnSchema.index({ purchaseOrderId: 1 });

export const ReturnModel = model<ReturnAttrs>("Return", returnSchema);
