import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as rawMaterialController from "./rawMaterial.controller.js";
import {
  createRawMaterialSchema,
  listRawMaterialsQuerySchema,
  updateRawMaterialSchema,
} from "./rawMaterial.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listRawMaterialsQuerySchema }),
  rawMaterialController.listRawMaterials
);

router.get("/low-stock", rawMaterialController.getLowStockRawMaterials);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  rawMaterialController.getRawMaterial
);

router.post(
  "/",
  validateRequest({ body: createRawMaterialSchema }),
  rawMaterialController.createRawMaterial
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateRawMaterialSchema }),
  rawMaterialController.updateRawMaterial
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  rawMaterialController.deleteRawMaterial
);

export const rawMaterialRouter = router;
