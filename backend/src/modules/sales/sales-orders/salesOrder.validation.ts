import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { gramsPerKgComponentsSchema } from "../../../shared/validation/gramsPerKgComponents.js";
import { DELIVERY_METHODS } from "./salesOrder.model.js";

const salesOrderItemSchema = Joi.object({
  itemType: Joi.string().valid("raw_material", "recipe", "returned_mix").required(),
  rawMaterialId: objectIdSchema.when("itemType", {
    is: "raw_material",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  recipeId: objectIdSchema.when("itemType", {
    is: Joi.valid("recipe", "returned_mix"),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  recipeComponents: gramsPerKgComponentsSchema().when("itemType", {
    is: "recipe",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  quantityKg: Joi.number().greater(0).required(),
  unitPrice: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100),
  discountAmount: Joi.number().min(0),
});

export const createSalesOrderSchema = Joi.object({
  customerId: objectIdSchema.required(),
  orderDate: Joi.date().iso().required(),
  expectedDeliveryDate: Joi.date().iso(),
  deliveryMethod: Joi.string()
    .valid(...DELIVERY_METHODS)
    .required(),
  items: Joi.array().items(salesOrderItemSchema).min(1).required(),
  notes: Joi.string().trim().allow(""),
});

export const updateSalesOrderSchema = Joi.object({
  customerId: objectIdSchema,
  orderDate: Joi.date().iso(),
  expectedDeliveryDate: Joi.date().iso(),
  deliveryMethod: Joi.string().valid(...DELIVERY_METHODS),
  items: Joi.array().items(salesOrderItemSchema).min(1),
  notes: Joi.string().trim().allow(""),
}).min(1);

export const cancelSalesOrderSchema = Joi.object({
  cancellationReason: Joi.string().trim().min(1).required(),
});

export const listSalesOrdersQuerySchema = Joi.object({
  customerId: objectIdSchema,
  status: Joi.string().valid("draft", "confirmed", "delivered", "cancelled"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
