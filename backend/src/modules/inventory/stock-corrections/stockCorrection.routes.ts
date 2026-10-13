import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as stockCorrectionController from "./stockCorrection.controller.js";
import {
  createStockCorrectionSchema,
  listStockCorrectionsQuerySchema,
} from "./stockCorrection.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listStockCorrectionsQuerySchema }),
  stockCorrectionController.listStockCorrections
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  stockCorrectionController.getStockCorrection
);

router.post(
  "/",
  validateRequest({ body: createStockCorrectionSchema }),
  stockCorrectionController.createStockCorrection
);

export const stockCorrectionRouter = router;
