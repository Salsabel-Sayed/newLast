import { Schema, model, Types } from "mongoose";

export const SALES_ORDER_ITEM_TYPES = ["raw_material", "recipe", "returned_mix"] as const;
export type SalesOrderItemType = (typeof SALES_ORDER_ITEM_TYPES)[number];

export const DELIVERY_METHODS = ["pickup", "delivery", "shipping_company"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const SALES_ORDER_STATUSES = ["draft", "confirmed", "delivered", "cancelled"] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export interface BatchAllocationSnapshot {
  batchId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

export interface RecipeComponentAttrs {
  rawMaterialId: Types.ObjectId;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
}

export interface RecipeComponentAllocation {
  rawMaterialId: Types.ObjectId;
  rawMaterialCode: string;
  rawMaterialName: string;
  allocations: BatchAllocationSnapshot[];
}

export interface ReturnedMixAllocationSnapshot {
  returnedMixBatchId: Types.ObjectId;
  quantityKg: number;
  unitCostPerKg: number;
}

export interface SalesOrderItemAttrs {
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
  recipeComponents: RecipeComponentAttrs[];
  recipeComponentAllocations: RecipeComponentAllocation[];
  returnedMixAllocations: ReturnedMixAllocationSnapshot[];
  costPerKg: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface SalesOrderAttrs {
  orderNumber: string;
  customerId: Types.ObjectId;
  customerName: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  deliveredDate?: Date;
  deliveryMethod: DeliveryMethod;
  status: SalesOrderStatus;
  cancellationReason?: string;
  cancelledAt?: Date;
  items: SalesOrderItemAttrs[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
}

const batchAllocationSchema = new Schema<BatchAllocationSnapshot>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    quantityKg: { type: Number, required: true, min: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const recipeComponentSchema = new Schema<RecipeComponentAttrs>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialCode: { type: String, required: true },
    rawMaterialName: { type: String, required: true },
    gramsPerKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const recipeComponentAllocationSchema = new Schema<RecipeComponentAllocation>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialCode: { type: String, required: true },
    rawMaterialName: { type: String, required: true },
    allocations: { type: [batchAllocationSchema], required: true, default: [] },
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
    quantityKg: { type: Number, required: true, min: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const salesOrderItemSchema = new Schema<SalesOrderItemAttrs>(
  {
    itemType: { type: String, enum: SALES_ORDER_ITEM_TYPES, required: true },
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    rawMaterialName: { type: String },
    rawMaterialCode: { type: String },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    recipeName: { type: String },
    recipeCode: { type: String },
    quantityKg: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountAmount: { type: Number, required: true, default: 0, min: 0 },
    batchAllocations: { type: [batchAllocationSchema], required: true, default: [] },
    recipeComponents: { type: [recipeComponentSchema], required: true, default: [] },
    returnedMixAllocations: {
      type: [returnedMixAllocationSchema],
      required: true,
      default: [],
    },
    recipeComponentAllocations: {
      type: [recipeComponentAllocationSchema],
      required: true,
      default: [],
    },
    costPerKg: { type: Number, required: true, default: 0, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const salesOrderSchema = new Schema<SalesOrderAttrs>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerName: { type: String, required: true },
    orderDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date },
    deliveredDate: { type: Date },
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, required: true },
    status: {
      type: String,
      enum: SALES_ORDER_STATUSES,
      required: true,
      default: "draft",
    },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    items: {
      type: [salesOrderItemSchema],
      required: true,
      validate: {
        validator: (items: SalesOrderItemAttrs[]) => items.length > 0,
        message: "يجب أن يحتوي أمر البيع على سطر واحد على الأقل",
      },
    },
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    discountAmount: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, default: 0, min: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

salesOrderSchema.index({ customerId: 1 });
salesOrderSchema.index({ status: 1 });

export const SalesOrderModel = model<SalesOrderAttrs>("SalesOrder", salesOrderSchema);
