import Joi from "joi";
import { isValidObjectId } from "mongoose";

export const objectIdSchema = Joi.string().custom((value: string, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error("any.invalid");
  }
  return value;
}, "MongoDB ObjectId validation");

export const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});
