import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as rawMaterialCategoryController from "./rawMaterialCategory.controller.js";
import {
  createRawMaterialCategorySchema,
  listRawMaterialCategoriesQuerySchema,
  updateRawMaterialCategorySchema,
} from "./rawMaterialCategory.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listRawMaterialCategoriesQuerySchema }),
  rawMaterialCategoryController.listRawMaterialCategories
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  rawMaterialCategoryController.getRawMaterialCategory
);

router.post(
  "/",
  validateRequest({ body: createRawMaterialCategorySchema }),
  rawMaterialCategoryController.createRawMaterialCategory
);

router.put(
  "/:id",
  validateRequest({
    params: idParamSchema,
    body: updateRawMaterialCategorySchema,
  }),
  rawMaterialCategoryController.updateRawMaterialCategory
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  rawMaterialCategoryController.deleteRawMaterialCategory
);

export const rawMaterialCategoryRouter = router;
