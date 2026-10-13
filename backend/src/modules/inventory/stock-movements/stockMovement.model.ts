import { Schema, model, Types } from "mongoose";

export const STOCK_MOVEMENT_DIRECTIONS = [
  "in",
  "out",
  "reserve",
  "release",
] as const;
export type StockMovementDirection = (typeof STOCK_MOVEMENT_DIRECTIONS)[number];

export const STOCK_MOVEMENT_TYPES = [
  "opening_balance",
  "purchase_receipt",
  "sales_reservation",
  "sales_reservation_release",
  "sales_issue",
  "sales_return",
  "returned_mix_in",
  "returned_mix_out",
  "purchase_return",
  "stock_correction_increase",
  "stock_correction_decrease",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface StockMovementAttrs {
  rawMaterialId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  returnedMixBatchId?: Types.ObjectId;
  quantityKg: number;
  direction: StockMovementDirection;
  movementType: StockMovementType;
  relatedEntityType: string;
  relatedEntityId: Types.ObjectId;
  notes?: string;
}

const stockMovementSchema = new Schema<StockMovementAttrs>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    returnedMixBatchId: { type: Schema.Types.ObjectId, ref: "ReturnedMixBatch" },
    quantityKg: { type: Number, required: true, min: 0 },
    direction: {
      type: String,
      enum: STOCK_MOVEMENT_DIRECTIONS,
      required: true,
    },
    movementType: {
      type: String,
      enum: STOCK_MOVEMENT_TYPES,
      required: true,
    },
    relatedEntityType: { type: String, required: true },
    relatedEntityId: { type: Schema.Types.ObjectId, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

stockMovementSchema.index({ rawMaterialId: 1, createdAt: -1 });
stockMovementSchema.index({ batchId: 1, createdAt: -1 });
stockMovementSchema.index({ returnedMixBatchId: 1, createdAt: -1 });
stockMovementSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

export const StockMovementModel = model<StockMovementAttrs>(
  "StockMovement",
  stockMovementSchema
);
