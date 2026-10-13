import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { PACKAGE_TYPES } from "../../../shared/constants/packageTypes.js";

const purchaseOrderItemSchema = Joi.object({
  rawMaterialId: objectIdSchema.required(),
  packageType: Joi.string()
    .valid(...PACKAGE_TYPES)
    .required(),
  customPackageName: Joi.string()
    .trim()
    .when("packageType", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  packageCount: Joi.number().greater(0).required(),
  kgPerPackage: Joi.number().greater(0).required(),
  totalCost: Joi.number().min(0).required(),
  productionDate: Joi.date().iso(),
});

export const createPurchaseOrderSchema = Joi.object({
  supplierId: objectIdSchema.required(),
  purchaseDate: Joi.date().iso().required(),
  items: Joi.array().items(purchaseOrderItemSchema).min(1).required(),
  notes: Joi.string().trim().allow(""),
});

export const updatePurchaseOrderSchema = Joi.object({
  supplierId: objectIdSchema,
  purchaseDate: Joi.date().iso(),
  items: Joi.array().items(purchaseOrderItemSchema).min(1),
  notes: Joi.string().trim().allow(""),
}).min(1);

export const listPurchaseOrdersQuerySchema = Joi.object({
  supplierId: objectIdSchema,
  status: Joi.string().valid("draft", "received", "cancelled"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
