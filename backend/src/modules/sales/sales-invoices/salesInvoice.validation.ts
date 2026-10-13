import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const listSalesInvoicesQuerySchema = Joi.object({
  customerId: objectIdSchema,
  status: Joi.string().valid("unpaid", "partial", "paid"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
