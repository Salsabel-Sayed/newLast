import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { PAYMENT_METHODS } from "./payment.model.js";

export const createPaymentSchema = Joi.object({
  direction: Joi.string().valid("collection", "payment").required(),
  customerId: objectIdSchema.when("direction", {
    is: "collection",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  supplierId: objectIdSchema.when("direction", {
    is: "payment",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  amount: Joi.number().greater(0).required(),
  paymentDate: Joi.date().iso().required(),
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required(),
  relatedInvoiceId: objectIdSchema,
});

export const voidPaymentSchema = Joi.object({
  voidReason: Joi.string().trim().min(1).required(),
});

export const listPaymentsQuerySchema = Joi.object({
  direction: Joi.string().valid("collection", "payment"),
  customerId: objectIdSchema,
  supplierId: objectIdSchema,
  status: Joi.string().valid("completed", "voided"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
