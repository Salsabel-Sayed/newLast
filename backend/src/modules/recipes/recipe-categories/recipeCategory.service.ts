import { AppError } from "../../../middlewares/Errors/appError.js";
import {
  guardedDelete,
  type DeleteOutcome,
} from "../../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { escapeRegex } from "../../../shared/utils/escapeRegex.js";
import { RecipeModel } from "../recipes/recipe.model.js";
import {
  RecipeCategoryModel,
  type RecipeCategoryAttrs,
} from "./recipeCategory.model.js";

interface ListRecipeCategoriesOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  page: number;
  limit: number;
}

export async function listRecipeCategories(options: ListRecipeCategoriesOptions) {
  const filter: Record<string, unknown> = {};

  if (options.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  if (options.search) {
    filter.name = new RegExp(escapeRegex(options.search), "i");
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    RecipeCategoryModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(options.limit),
    RecipeCategoryModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getRecipeCategoryById(id: string) {
  const category = await RecipeCategoryModel.findById(id);
  if (!category) {
    throw new AppError("فئة الوصفات غير موجودة", 404);
  }
  return category;
}

export async function createRecipeCategory(data: RecipeCategoryAttrs) {
  return RecipeCategoryModel.create(data);
}

export async function updateRecipeCategory(
  id: string,
  data: Partial<RecipeCategoryAttrs>
) {
  const category = await RecipeCategoryModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!category) {
    throw new AppError("فئة الوصفات غير موجودة", 404);
  }

  return category;
}

export async function deleteRecipeCategory(id: string): Promise<DeleteOutcome> {
  return guardedDelete(RecipeCategoryModel, id, [
    { model: RecipeModel, field: "categoryId" },
  ]);
}
