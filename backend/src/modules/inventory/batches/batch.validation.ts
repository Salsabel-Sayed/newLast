import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { BATCH_STATUSES } from "./batch.model.js";

export const listBatchesQuerySchema = Joi.object({
  rawMaterialId: objectIdSchema,
  status: Joi.string().valid(...BATCH_STATUSES),
  supplierId: objectIdSchema,
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});

export const updateBatchSchema = Joi.object({
  notes: Joi.string().trim().allow(""),
}).min(1);
