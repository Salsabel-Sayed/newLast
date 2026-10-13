import Joi from "joi";

export const updateSettingsSchema = Joi.object({
  companyName: Joi.string().trim().allow(""),
  currency: Joi.string().trim().min(1),
  defaultTaxPercent: Joi.number().min(0).max(100),
  allowPermanentDelete: Joi.boolean(),
  systemInitialized: Joi.boolean(),
}).min(1);

export const confirmDestructiveActionSchema = Joi.object({
  confirm: Joi.valid(true).required(),
});
