import Joi from "joi";
import { objectIdSchema } from "../../shared/validation/objectId.js";

const dateRange = {
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
};

export const salesReportQuerySchema = Joi.object({
  ...dateRange,
  customerId: objectIdSchema,
});

export const purchasesReportQuerySchema = Joi.object({
  ...dateRange,
  supplierId: objectIdSchema,
});

export const expensesReportQuerySchema = Joi.object({
  ...dateRange,
  category: Joi.string().trim(),
});

export const collectionsReportQuerySchema = Joi.object({
  ...dateRange,
  customerId: objectIdSchema,
});

export const paymentsReportQuerySchema = Joi.object({
  ...dateRange,
  supplierId: objectIdSchema,
});

export const profitReportQuerySchema = Joi.object({
  ...dateRange,
});

export const topNReportQuerySchema = Joi.object({
  ...dateRange,
  limit: Joi.number().integer().greater(0).max(100).default(10),
});

export const lowStockReportQuerySchema = Joi.object({});

export const returnedMixReportQuerySchema = Joi.object({
  recipeId: objectIdSchema,
});
