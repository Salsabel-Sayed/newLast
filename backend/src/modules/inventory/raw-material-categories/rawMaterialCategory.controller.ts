import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as rawMaterialCategoryService from "./rawMaterialCategory.service.js";

export const listRawMaterialCategories = catchError(
  async (req: Request, res: Response) => {
    const query = req.query as {
      search?: string;
      isActive?: "true" | "false";
      page?: string;
      limit?: string;
    };
    const { page, limit } = parsePagination(query);

    const result = await rawMaterialCategoryService.listRawMaterialCategories({
      search: query.search,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === "true",
      page,
      limit,
    });

    sendSuccess(res, result);
  }
);

export const getRawMaterialCategory = catchError(
  async (req: Request, res: Response) => {
    const category = await rawMaterialCategoryService.getRawMaterialCategoryById(
      getIdParam(req)
    );
    sendSuccess(res, category);
  }
);

export const createRawMaterialCategory = catchError(
  async (req: Request, res: Response) => {
    const category = await rawMaterialCategoryService.createRawMaterialCategory(
      req.body
    );
    sendSuccess(res, category, 201);
  }
);

export const updateRawMaterialCategory = catchError(
  async (req: Request, res: Response) => {
    const category = await rawMaterialCategoryService.updateRawMaterialCategory(
      getIdParam(req),
      req.body
    );
    sendSuccess(res, category);
  }
);

export const deleteRawMaterialCategory = catchError(
  async (req: Request, res: Response) => {
    const outcome = await rawMaterialCategoryService.deleteRawMaterialCategory(
      getIdParam(req)
    );
    sendSuccess(res, { outcome });
  }
);
