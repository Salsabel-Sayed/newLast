import { AppError } from "../../../middlewares/Errors/appError.js";
import {
  guardedDelete,
  type DeleteOutcome,
} from "../../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { escapeRegex } from "../../../shared/utils/escapeRegex.js";
import { computeStockSummaries } from "../../inventory/raw-materials/rawMaterial.service.js";
import { RawMaterialModel } from "../../inventory/raw-materials/rawMaterial.model.js";
import { RecipeCategoryModel } from "../recipe-categories/recipeCategory.model.js";
import { SalesOrderModel } from "../../sales/sales-orders/salesOrder.model.js";
import { RecipeModel, type RecipeComponentAttrs } from "./recipe.model.js";

export interface RecipeComponentInput {
  rawMaterialId: string;
  gramsPerKg: number;
}

export interface CreateRecipeInput {
  code: string;
  name: string;
  categoryId?: string;
  components: RecipeComponentInput[];
  isActive?: boolean;
  notes?: string;
}

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

async function buildComponents(
  components: RecipeComponentInput[]
): Promise<RecipeComponentAttrs[]> {
  return Promise.all(
    components.map(async (component) => {
      const rawMaterial = await RawMaterialModel.findById(component.rawMaterialId);
      if (!rawMaterial) {
        throw new AppError("مادة خام غير موجودة ضمن مكونات الوصفة", 404);
      }
      return {
        rawMaterialId: rawMaterial._id,
        rawMaterialCode: rawMaterial.code,
        rawMaterialName: rawMaterial.name,
        gramsPerKg: component.gramsPerKg,
      };
    })
  );
}

async function assertCategoryExists(categoryId: string) {
  const category = await RecipeCategoryModel.findById(categoryId);
  if (!category) {
    throw new AppError("فئة الوصفات غير موجودة", 404);
  }
}

interface ListRecipesOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  categoryId?: string | undefined;
  page: number;
  limit: number;
}

export async function listRecipes(options: ListRecipesOptions) {
  const filter: Record<string, unknown> = {};

  if (options.isActive !== undefined) filter.isActive = options.isActive;
  if (options.categoryId) filter.categoryId = options.categoryId;
  if (options.search) {
    const regex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [{ code: regex }, { name: regex }];
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    RecipeModel.find(filter).sort({ name: 1 }).skip(skip).limit(options.limit),
    RecipeModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getRecipeById(id: string) {
  const recipe = await RecipeModel.findById(id);
  if (!recipe) {
    throw new AppError("الوصفة غير موجودة", 404);
  }
  return recipe;
}

export async function createRecipe(input: CreateRecipeInput) {
  const existing = await RecipeModel.findOne({ code: input.code });
  if (existing) {
    throw new AppError("كود الوصفة مستخدم بالفعل", 409);
  }

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  const components = await buildComponents(input.components);

  return RecipeModel.create({
    code: input.code,
    name: input.name,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    components,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  const recipe = await RecipeModel.findById(id);
  if (!recipe) {
    throw new AppError("الوصفة غير موجودة", 404);
  }

  if (input.code && input.code !== recipe.code) {
    const existing = await RecipeModel.findOne({ code: input.code, _id: { $ne: id } });
    if (existing) {
      throw new AppError("كود الوصفة مستخدم بالفعل", 409);
    }
    recipe.code = input.code;
  }

  if (input.name) recipe.name = input.name;

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
    recipe.set("categoryId", input.categoryId);
  }

  if (input.components) {
    recipe.components = await buildComponents(input.components);
  }

  if (input.isActive !== undefined) recipe.isActive = input.isActive;
  if (input.notes !== undefined) recipe.notes = input.notes;

  await recipe.save();
  return recipe;
}

export async function deleteRecipe(id: string): Promise<DeleteOutcome> {
  return guardedDelete(RecipeModel, id, [
    { model: SalesOrderModel, field: "items.recipeId" },
  ]);
}

export interface EstimatedCostComponent {
  rawMaterialId: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
  averageCostPerKg: number;
  componentCost: number;
}

export async function getEstimatedCost(id: string) {
  const recipe = await RecipeModel.findById(id);
  if (!recipe) {
    throw new AppError("الوصفة غير موجودة", 404);
  }

  const summaries = await computeStockSummaries(
    recipe.components.map((c) => c.rawMaterialId)
  );

  const components: EstimatedCostComponent[] = recipe.components.map((component) => {
    const averageCostPerKg =
      summaries.get(component.rawMaterialId.toString())?.averageCostPerKg ?? 0;
    const componentCost = (component.gramsPerKg / 1000) * averageCostPerKg;
    return {
      rawMaterialId: component.rawMaterialId.toString(),
      rawMaterialCode: component.rawMaterialCode,
      rawMaterialName: component.rawMaterialName,
      gramsPerKg: component.gramsPerKg,
      averageCostPerKg,
      componentCost,
    };
  });

  const costPerKg = components.reduce((sum, c) => sum + c.componentCost, 0);

  return { recipeId: recipe.id, costPerKg, components };
}
