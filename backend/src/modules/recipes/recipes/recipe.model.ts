import { Schema, model, Types } from "mongoose";

export interface RecipeComponentAttrs {
  rawMaterialId: Types.ObjectId;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
}

export interface RecipeAttrs {
  code: string;
  name: string;
  categoryId?: Types.ObjectId;
  components: RecipeComponentAttrs[];
  isActive: boolean;
  notes?: string;
}

const recipeComponentSchema = new Schema<RecipeComponentAttrs>(
  {
    rawMaterialId: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialCode: { type: String, required: true },
    rawMaterialName: { type: String, required: true },
    gramsPerKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const recipeSchema = new Schema<RecipeAttrs>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "RecipeCategory" },
    components: {
      type: [recipeComponentSchema],
      required: true,
      validate: {
        validator: (components: RecipeComponentAttrs[]) => components.length > 0,
        message: "يجب أن تحتوي الوصفة على مكوّن واحد على الأقل",
      },
    },
    isActive: { type: Boolean, required: true, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

recipeSchema.index({ name: 1 });
recipeSchema.index({ isActive: 1 });
recipeSchema.index({ categoryId: 1 });

export const RecipeModel = model<RecipeAttrs>("Recipe", recipeSchema);
