import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const listReturnedMixBatchesQuerySchema = Joi.object({
  recipeId: objectIdSchema,
  status: Joi.string().valid("active", "depleted", "disposed"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});

export const convertToLossSchema = Joi.object({
  quantityKg: Joi.number().greater(0).required(),
});
