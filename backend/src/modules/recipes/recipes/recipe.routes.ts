import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as recipeController from "./recipe.controller.js";
import {
  createRecipeSchema,
  listRecipesQuerySchema,
  updateRecipeSchema,
} from "./recipe.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listRecipesQuerySchema }),
  recipeController.listRecipes
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  recipeController.getRecipe
);

router.get(
  "/:id/estimated-cost",
  validateRequest({ params: idParamSchema }),
  recipeController.getRecipeEstimatedCost
);

router.post(
  "/",
  validateRequest({ body: createRecipeSchema }),
  recipeController.createRecipe
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateRecipeSchema }),
  recipeController.updateRecipe
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  recipeController.deleteRecipe
);

export const recipeRouter = router;
