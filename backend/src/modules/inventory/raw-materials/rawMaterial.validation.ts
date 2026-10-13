import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const createRawMaterialSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).required(),
  categoryId: objectIdSchema,
  minStockLevel: Joi.number().min(0),
  supplierIds: Joi.array().items(objectIdSchema),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
});

export const updateRawMaterialSchema = Joi.object({
  code: Joi.string().trim().min(1),
  name: Joi.string().trim().min(1),
  categoryId: objectIdSchema,
  minStockLevel: Joi.number().min(0),
  supplierIds: Joi.array().items(objectIdSchema),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
}).min(1);

export const listRawMaterialsQuerySchema = Joi.object({
  search: Joi.string().trim().allow(""),
  isActive: Joi.string().valid("true", "false"),
  categoryId: objectIdSchema,
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
