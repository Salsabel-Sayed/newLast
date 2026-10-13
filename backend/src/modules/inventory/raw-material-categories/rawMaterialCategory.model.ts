import { Schema, model } from "mongoose";

export interface RawMaterialCategoryAttrs {
  name: string;
  isActive: boolean;
}

const rawMaterialCategorySchema = new Schema<RawMaterialCategoryAttrs>(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

rawMaterialCategorySchema.index({ name: 1 });
rawMaterialCategorySchema.index({ isActive: 1 });

export const RawMaterialCategoryModel = model<RawMaterialCategoryAttrs>(
  "RawMaterialCategory",
  rawMaterialCategorySchema
);
