import Joi from "joi";
import { objectIdSchema } from "./objectId.js";

const GRAMS_PER_KG_TOTAL = 1000;
const GRAMS_EPSILON = 0.01;

function validateComponents(
  components: { rawMaterialId: string; gramsPerKg: number }[],
  helpers: Joi.CustomHelpers
) {
  const total = components.reduce((sum, c) => sum + c.gramsPerKg, 0);
  if (Math.abs(total - GRAMS_PER_KG_TOTAL) > GRAMS_EPSILON) {
    return helpers.error("components.sum", { total });
  }

  const rawMaterialIds = components.map((c) => c.rawMaterialId);
  if (new Set(rawMaterialIds).size !== rawMaterialIds.length) {
    return helpers.error("components.duplicate");
  }

  return components;
}

export function gramsPerKgComponentsSchema(): Joi.ArraySchema {
  return Joi.array()
    .items(
      Joi.object({
        rawMaterialId: objectIdSchema.required(),
        gramsPerKg: Joi.number().greater(0).required(),
      })
    )
    .min(1)
    .custom(validateComponents)
    .messages({
      "components.sum":
        "مجموع gramsPerKg للمكونات يجب أن يساوي 1000 جرام بالضبط (المجموع الحالي: {{#total}})",
      "components.duplicate": "لا يجوز تكرار نفس المادة الخام أكثر من مرة داخل نفس المكونات",
    });
}
