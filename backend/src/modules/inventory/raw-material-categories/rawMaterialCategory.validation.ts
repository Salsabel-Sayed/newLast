import Joi from "joi";

export const createRawMaterialCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  isActive: Joi.boolean(),
});

export const updateRawMaterialCategorySchema = Joi.object({
  name: Joi.string().trim().min(1),
  isActive: Joi.boolean(),
}).min(1);

export const listRawMaterialCategoriesQuerySchema = Joi.object({
  search: Joi.string().trim().allow(""),
  isActive: Joi.string().valid("true", "false"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
