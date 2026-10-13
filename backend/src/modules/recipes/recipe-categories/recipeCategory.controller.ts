import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as recipeCategoryService from "./recipeCategory.service.js";

export const listRecipeCategories = catchError(
  async (req: Request, res: Response) => {
    const query = req.query as {
      search?: string;
      isActive?: "true" | "false";
      page?: string;
      limit?: string;
    };
    const { page, limit } = parsePagination(query);

    const result = await recipeCategoryService.listRecipeCategories({
      search: query.search,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === "true",
      page,
      limit,
    });

    sendSuccess(res, result);
  }
);

export const getRecipeCategory = catchError(async (req: Request, res: Response) => {
  const category = await recipeCategoryService.getRecipeCategoryById(
    getIdParam(req)
  );
  sendSuccess(res, category);
});

export const createRecipeCategory = catchError(
  async (req: Request, res: Response) => {
    const category = await recipeCategoryService.createRecipeCategory(req.body);
    sendSuccess(res, category, 201);
  }
);

export const updateRecipeCategory = catchError(
  async (req: Request, res: Response) => {
    const category = await recipeCategoryService.updateRecipeCategory(
      getIdParam(req),
      req.body
    );
    sendSuccess(res, category);
  }
);

export const deleteRecipeCategory = catchError(
  async (req: Request, res: Response) => {
    const outcome = await recipeCategoryService.deleteRecipeCategory(
      getIdParam(req)
    );
    sendSuccess(res, { outcome });
  }
);
