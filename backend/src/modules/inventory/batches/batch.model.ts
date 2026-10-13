import { Schema, model, Types } from "mongoose";

export const BATCH_SOURCES = ["opening_balance", "purchase", "sales_return"] as const;
export type BatchSource = (typeof BATCH_SOURCES)[number];

export const BATCH_STATUSES = ["active", "depleted", "locked"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export interface BatchAttrs {
  batchCode: string;
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  supplierId?: Types.ObjectId;
  source: BatchSource;
  originalQty: number;
  remainingQty: number;
  reservedQty: number;
  unitCostPerKg: number;
  productionDate?: Date;
  purchaseDate: Date;
  depletedAt?: Date;
  purchaseOrderId?: Types.ObjectId;
  sourceReturnId?: Types.ObjectId;
  status: BatchStatus;
  notes?: string;
}

const batchSchema = new Schema<BatchAttrs>(
  {
    batchCode: { type: String, required: true, unique: true },
    rawMaterialId: {
      type: Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    rawMaterialName: { type: String, required: true },
    rawMaterialCode: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    source: { type: String, enum: BATCH_SOURCES, required: true },
    originalQty: { type: Number, required: true, min: 0 },
    remainingQty: { type: Number, required: true, min: 0, default: 0 },
    reservedQty: { type: Number, required: true, min: 0, default: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
    productionDate: { type: Date },
    purchaseDate: { type: Date, required: true },
    depletedAt: { type: Date },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    sourceReturnId: { type: Schema.Types.ObjectId, ref: "Return" },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      required: true,
      default: "active",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

batchSchema.index({ rawMaterialId: 1, status: 1 });
batchSchema.index({ supplierId: 1 });
batchSchema.index({ purchaseOrderId: 1 });

export const BatchModel = model<BatchAttrs>("Batch", batchSchema);
