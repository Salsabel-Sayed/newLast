import { Schema, model, Types } from "mongoose";

export const RETURNED_MIX_BATCH_STATUSES = ["active", "depleted", "disposed"] as const;
export type ReturnedMixBatchStatus = (typeof RETURNED_MIX_BATCH_STATUSES)[number];

export interface ReturnedMixBatchAttrs {
  recipeId: Types.ObjectId;
  recipeName: string;
  originalQty: number;
  remainingQty: number;
  reservedQty: number;
  unitCostPerKg: number;
  sourceReturnId: Types.ObjectId;
  returnDate: Date;
  status: ReturnedMixBatchStatus;
}

const returnedMixBatchSchema = new Schema<ReturnedMixBatchAttrs>(
  {
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    recipeName: { type: String, required: true },
    originalQty: { type: Number, required: true, min: 0 },
    remainingQty: { type: Number, required: true, min: 0 },
    reservedQty: { type: Number, required: true, default: 0, min: 0 },
    unitCostPerKg: { type: Number, required: true, min: 0 },
    sourceReturnId: { type: Schema.Types.ObjectId, ref: "Return", required: true },
    returnDate: { type: Date, required: true },
    status: {
      type: String,
      enum: RETURNED_MIX_BATCH_STATUSES,
      required: true,
      default: "active",
    },
  },
  { timestamps: true }
);

returnedMixBatchSchema.index({ recipeId: 1, status: 1 });
returnedMixBatchSchema.index({ sourceReturnId: 1 });

export const ReturnedMixBatchModel = model<ReturnedMixBatchAttrs>(
  "ReturnedMixBatch",
  returnedMixBatchSchema
);
