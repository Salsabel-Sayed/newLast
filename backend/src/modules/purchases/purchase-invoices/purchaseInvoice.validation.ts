import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const listPurchaseInvoicesQuerySchema = Joi.object({
  supplierId: objectIdSchema,
  status: Joi.string().valid("unpaid", "partial", "paid"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
