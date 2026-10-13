import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema, ValidationError } from "joi";
import { AppError } from "../../middlewares/Errors/appError.js";

interface RequestValidationSchemas {
  params?: ObjectSchema;
  query?: ObjectSchema;
  body?: ObjectSchema;
}

function formatJoiError(error: ValidationError): string {
  return error.details.map((detail) => detail.message).join(", ");
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const { value, error } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        next(new AppError(formatJoiError(error), 400));
        return;
      }
      req.params = value;
    }

    if (schemas.query) {
      const { value, error } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        next(new AppError(formatJoiError(error), 400));
        return;
      }
      // req.query is a read-only getter in Express 5; must shadow it with an own property.
      Object.defineProperty(req, "query", {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    if (schemas.body) {
      const { value, error } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        next(new AppError(formatJoiError(error), 400));
        return;
      }
      req.body = value;
    }

    next();
  };
}
