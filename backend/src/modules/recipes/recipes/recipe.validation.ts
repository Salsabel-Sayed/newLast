import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { gramsPerKgComponentsSchema } from "../../../shared/validation/gramsPerKgComponents.js";

export const createRecipeSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).required(),
  categoryId: objectIdSchema,
  components: gramsPerKgComponentsSchema().required(),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
});

export const updateRecipeSchema = Joi.object({
  code: Joi.string().trim().min(1),
  name: Joi.string().trim().min(1),
  categoryId: objectIdSchema,
  components: gramsPerKgComponentsSchema(),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
}).min(1);

export const listRecipesQuerySchema = Joi.object({
  search: Joi.string().trim().allow(""),
  isActive: Joi.string().valid("true", "false"),
  categoryId: objectIdSchema,
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
