import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as rawMaterialService from "./rawMaterial.service.js";

export const listRawMaterials = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    search?: string;
    isActive?: "true" | "false";
    categoryId?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await rawMaterialService.listRawMaterials({
    search: query.search,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    categoryId: query.categoryId,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getLowStockRawMaterials = catchError(
  async (_req: Request, res: Response) => {
    const items = await rawMaterialService.listLowStockRawMaterials();
    sendSuccess(res, items);
  }
);

export const getRawMaterial = catchError(async (req: Request, res: Response) => {
  const rawMaterial = await rawMaterialService.getRawMaterialById(getIdParam(req));
  sendSuccess(res, rawMaterial);
});

export const createRawMaterial = catchError(async (req: Request, res: Response) => {
  const rawMaterial = await rawMaterialService.createRawMaterial(req.body);
  sendSuccess(res, rawMaterial, 201);
});

export const updateRawMaterial = catchError(async (req: Request, res: Response) => {
  const rawMaterial = await rawMaterialService.updateRawMaterial(
    getIdParam(req),
    req.body
  );
  sendSuccess(res, rawMaterial);
});

export const deleteRawMaterial = catchError(async (req: Request, res: Response) => {
  const outcome = await rawMaterialService.deleteRawMaterial(getIdParam(req));
  sendSuccess(res, { outcome });
});
