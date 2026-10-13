import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const createStockCorrectionSchema = Joi.object({
  batchId: objectIdSchema.required(),
  quantityAfterKg: Joi.number().min(0).required(),
  reason: Joi.string().trim().min(1).required(),
  correctionDate: Joi.date().iso().required(),
  notes: Joi.string().trim().allow(""),
});

export const listStockCorrectionsQuerySchema = Joi.object({
  batchId: objectIdSchema,
  rawMaterialId: objectIdSchema,
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
