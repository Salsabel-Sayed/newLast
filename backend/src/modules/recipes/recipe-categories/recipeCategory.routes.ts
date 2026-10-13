import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as recipeCategoryController from "./recipeCategory.controller.js";
import {
  createRecipeCategorySchema,
  listRecipeCategoriesQuerySchema,
  updateRecipeCategorySchema,
} from "./recipeCategory.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listRecipeCategoriesQuerySchema }),
  recipeCategoryController.listRecipeCategories
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  recipeCategoryController.getRecipeCategory
);

router.post(
  "/",
  validateRequest({ body: createRecipeCategorySchema }),
  recipeCategoryController.createRecipeCategory
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateRecipeCategorySchema }),
  recipeCategoryController.updateRecipeCategory
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  recipeCategoryController.deleteRecipeCategory
);

export const recipeCategoryRouter = router;
