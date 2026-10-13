import type { NextFunction, Request, Response } from "express";
import { AppError } from "./appError.js";
import { env } from "../../config/env.js";

export const globalError = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const code = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";

  const body: Record<string, unknown> = { success: false, message };
  if (env.NODE_ENV === "development" && err instanceof Error) {
    body["stack"] = err.stack;
  }
  res.status(code).json(body);
};
