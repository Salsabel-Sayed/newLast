import Joi from "joi";

export const createCustomerSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).required(),
  phone: Joi.string().trim().allow(""),
  email: Joi.string().trim().email({ tlds: false }).allow(""),
  address: Joi.string().trim().allow(""),
  openingBalanceAmount: Joi.number()
    .min(0)
    .custom((value, helpers) =>
      Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
        ? helpers.error("number.precision", { limit: 2 })
        : value
    )
    .default(0),
  openingBalanceDate: Joi.date().iso(),
  openingBalanceSide: Joi.string().valid("they_owe_us", "we_owe_them").default("they_owe_us"),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
});

export const updateCustomerSchema = Joi.object({
  code: Joi.string().trim().min(1),
  name: Joi.string().trim().min(1),
  phone: Joi.string().trim().allow(""),
  email: Joi.string().trim().email({ tlds: false }).allow(""),
  address: Joi.string().trim().allow(""),
  isActive: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
}).min(1);

export const listCustomersQuerySchema = Joi.object({
  search: Joi.string().trim().allow(""),
  isActive: Joi.string().valid("true", "false"),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
