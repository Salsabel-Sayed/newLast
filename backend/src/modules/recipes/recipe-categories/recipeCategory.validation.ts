import Joi from "joi";

export const createRecipeCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  isActive: Joi.boolean(),
});

export const updateRecipeCategorySchema = Joi.object({
  name: Joi.string().trim().min(1),
  isActive: Joi.boolean(),
}).min(1);

export const listRecipeCategoriesQuerySchema = Joi.object({
  search: Joi.string().trim().allow(""),
  isActive: Joi.string().valid("true", "false"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
