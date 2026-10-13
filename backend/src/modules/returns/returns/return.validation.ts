import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { RETURN_DISPOSITIONS, RETURN_TYPES } from "./return.model.js";

const salesRawMaterialItemSchema = Joi.object({
  rawMaterialId: objectIdSchema.required(),
  quantityKg: Joi.number().greater(0).required(),
});

const salesRecipeItemSchema = Joi.object({
  recipeId: objectIdSchema.required(),
  quantityKg: Joi.number().greater(0).required(),
  disposition: Joi.string()
    .valid(...RETURN_DISPOSITIONS)
    .required(),
});

const purchaseReturnItemSchema = Joi.object({
  batchId: objectIdSchema.required(),
  quantityKg: Joi.number().greater(0).required(),
});

export const createReturnSchema = Joi.object({
  returnType: Joi.string()
    .valid(...RETURN_TYPES)
    .required(),
  returnDate: Joi.date().iso().required(),
  customerId: objectIdSchema.when("returnType", {
    is: Joi.valid("sales_raw_material", "sales_recipe"),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  supplierId: objectIdSchema.when("returnType", {
    is: "purchase_return",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  salesOrderId: objectIdSchema.when("returnType", {
    is: Joi.valid("sales_raw_material", "sales_recipe"),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  purchaseOrderId: objectIdSchema.when("returnType", {
    is: "purchase_return",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  items: Joi.when("returnType", {
    switch: [
      {
        is: "sales_raw_material",
        then: Joi.array().items(salesRawMaterialItemSchema).min(1).required(),
      },
      {
        is: "sales_recipe",
        then: Joi.array().items(salesRecipeItemSchema).min(1).required(),
      },
      {
        is: "purchase_return",
        then: Joi.array().items(purchaseReturnItemSchema).min(1).required(),
      },
    ],
  }),
  notes: Joi.string().trim().allow(""),
});

export const listReturnsQuerySchema = Joi.object({
  returnType: Joi.string().valid(...RETURN_TYPES),
  customerId: objectIdSchema,
  supplierId: objectIdSchema,
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
