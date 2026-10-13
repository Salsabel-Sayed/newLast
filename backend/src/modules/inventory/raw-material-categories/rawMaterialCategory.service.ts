import { AppError } from "../../../middlewares/Errors/appError.js";
import {
  guardedDelete,
  type DeleteOutcome,
} from "../../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { escapeRegex } from "../../../shared/utils/escapeRegex.js";
import { RawMaterialModel } from "../raw-materials/rawMaterial.model.js";
import {
  RawMaterialCategoryModel,
  type RawMaterialCategoryAttrs,
} from "./rawMaterialCategory.model.js";

interface ListRawMaterialCategoriesOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  page: number;
  limit: number;
}

export async function listRawMaterialCategories(
  options: ListRawMaterialCategoriesOptions
) {
  const filter: Record<string, unknown> = {};

  if (options.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  if (options.search) {
    filter.name = new RegExp(escapeRegex(options.search), "i");
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    RawMaterialCategoryModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(options.limit),
    RawMaterialCategoryModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getRawMaterialCategoryById(id: string) {
  const category = await RawMaterialCategoryModel.findById(id);
  if (!category) {
    throw new AppError("فئة المواد الخام غير موجودة", 404);
  }
  return category;
}

export async function createRawMaterialCategory(data: RawMaterialCategoryAttrs) {
  return RawMaterialCategoryModel.create(data);
}

export async function updateRawMaterialCategory(
  id: string,
  data: Partial<RawMaterialCategoryAttrs>
) {
  const category = await RawMaterialCategoryModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!category) {
    throw new AppError("فئة المواد الخام غير موجودة", 404);
  }

  return category;
}

export async function deleteRawMaterialCategory(
  id: string
): Promise<DeleteOutcome> {
  return guardedDelete(RawMaterialCategoryModel, id, [
    { model: RawMaterialModel, field: "categoryId" },
  ]);
}
