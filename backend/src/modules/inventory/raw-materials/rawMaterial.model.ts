import { Schema, model, Types } from "mongoose";

export interface RawMaterialAttrs {
  code: string;
  name: string;
  categoryId?: Types.ObjectId;
  minStockLevel: number;
  supplierIds: Types.ObjectId[];
  isActive: boolean;
  notes?: string;
}

const rawMaterialSchema = new Schema<RawMaterialAttrs>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "RawMaterialCategory" },
    minStockLevel: { type: Number, required: true, default: 0, min: 0 },
    supplierIds: [{ type: Schema.Types.ObjectId, ref: "Supplier" }],
    isActive: { type: Boolean, required: true, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

rawMaterialSchema.index({ name: 1 });
rawMaterialSchema.index({ isActive: 1 });
rawMaterialSchema.index({ categoryId: 1 });

export const RawMaterialModel = model<RawMaterialAttrs>(
  "RawMaterial",
  rawMaterialSchema
);
