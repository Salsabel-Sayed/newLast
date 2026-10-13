import { Schema, model, Types } from "mongoose";

export interface StockCorrectionAttrs {
  correctionNumber: string;
  batchId: Types.ObjectId;
  batchCode: string;
  rawMaterialId: Types.ObjectId;
  rawMaterialName: string;
  rawMaterialCode: string;
  quantityBeforeKg: number;
  quantityAfterKg: number;
  differenceKg: number;
  reason: string;
  correctionDate: Date;
  notes?: string;
}

const stockCorrectionSchema = new Schema<StockCorrectionAttrs>(
  {
    correctionNumber: { type: String, required: true, unique: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    batchCode: { type: String, required: true },
    rawMaterialId: {
      type: Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    rawMaterialName: { type: String, required: true },
    rawMaterialCode: { type: String, required: true },
    quantityBeforeKg: { type: Number, required: true, min: 0 },
    quantityAfterKg: { type: Number, required: true, min: 0 },
    differenceKg: { type: Number, required: true },
    reason: { type: String, required: true },
    correctionDate: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

stockCorrectionSchema.index({ batchId: 1, createdAt: -1 });
stockCorrectionSchema.index({ rawMaterialId: 1, createdAt: -1 });

export const StockCorrectionModel = model<StockCorrectionAttrs>(
  "StockCorrection",
  stockCorrectionSchema
);
