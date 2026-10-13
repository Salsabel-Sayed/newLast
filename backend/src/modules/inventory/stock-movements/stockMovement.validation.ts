import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { STOCK_MOVEMENT_TYPES } from "./stockMovement.model.js";

export const listStockMovementsQuerySchema = Joi.object({
  rawMaterialId: objectIdSchema,
  batchId: objectIdSchema,
  returnedMixBatchId: objectIdSchema,
  relatedEntityType: Joi.string().trim(),
  relatedEntityId: objectIdSchema,
  movementType: Joi.string().valid(...STOCK_MOVEMENT_TYPES),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
