import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as recipeService from "./recipe.service.js";

export const listRecipes = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    search?: string;
    isActive?: "true" | "false";
    categoryId?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await recipeService.listRecipes({
    search: query.search,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    categoryId: query.categoryId,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getRecipe = catchError(async (req: Request, res: Response) => {
  const recipe = await recipeService.getRecipeById(getIdParam(req));
  sendSuccess(res, recipe);
});

export const getRecipeEstimatedCost = catchError(async (req: Request, res: Response) => {
  const estimatedCost = await recipeService.getEstimatedCost(getIdParam(req));
  sendSuccess(res, estimatedCost);
});

export const createRecipe = catchError(async (req: Request, res: Response) => {
  const recipe = await recipeService.createRecipe(req.body);
  sendSuccess(res, recipe, 201);
});

export const updateRecipe = catchError(async (req: Request, res: Response) => {
  const recipe = await recipeService.updateRecipe(getIdParam(req), req.body);
  sendSuccess(res, recipe);
});

export const deleteRecipe = catchError(async (req: Request, res: Response) => {
  const outcome = await recipeService.deleteRecipe(getIdParam(req));
  sendSuccess(res, { outcome });
});
