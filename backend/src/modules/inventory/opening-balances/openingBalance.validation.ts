import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { PACKAGE_TYPES } from "../../../shared/constants/packageTypes.js";

const openingBalanceItemSchema = Joi.object({
  rawMaterialId: objectIdSchema.required(),
  supplierId: objectIdSchema,
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

export const createOpeningBalanceSchema = Joi.object({
  openingDate: Joi.date().iso().required(),
  items: Joi.array().items(openingBalanceItemSchema).min(1).required(),
  notes: Joi.string().trim().allow(""),
});

export const listOpeningBalancesQuerySchema = Joi.object({
  status: Joi.string().valid("draft", "posted"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
