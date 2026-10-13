import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";

export const createExpenseSchema = Joi.object({
  category: Joi.string().trim().min(1).required(),
  amount: Joi.number().greater(0).required(),
  expenseDate: Joi.date().iso().required(),
  description: Joi.string().trim().min(1).required(),
  linkedSalesOrderId: objectIdSchema,
  notes: Joi.string().trim().allow(""),
});

export const updateExpenseSchema = Joi.object({
  category: Joi.string().trim().min(1),
  amount: Joi.number().greater(0),
  expenseDate: Joi.date().iso(),
  description: Joi.string().trim().min(1),
  linkedSalesOrderId: objectIdSchema,
  notes: Joi.string().trim().allow(""),
}).min(1);

export const listExpensesQuerySchema = Joi.object({
  category: Joi.string().trim(),
  linkedSalesOrderId: objectIdSchema,
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
