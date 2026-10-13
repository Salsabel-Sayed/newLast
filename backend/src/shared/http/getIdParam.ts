import type { Request } from "express";
import { AppError } from "../../middlewares/Errors/appError.js";

export function getIdParam(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError("معرف غير صالح", 400);
  }
  return id;
}
