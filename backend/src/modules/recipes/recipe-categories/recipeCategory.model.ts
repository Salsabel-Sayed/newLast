import { Schema, model } from "mongoose";

export interface RecipeCategoryAttrs {
  name: string;
  isActive: boolean;
}

const recipeCategorySchema = new Schema<RecipeCategoryAttrs>(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

recipeCategorySchema.index({ name: 1 });
recipeCategorySchema.index({ isActive: 1 });

export const RecipeCategoryModel = model<RecipeCategoryAttrs>(
  "RecipeCategory",
  recipeCategorySchema
);
