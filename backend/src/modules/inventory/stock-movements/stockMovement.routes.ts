import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import * as stockMovementController from "./stockMovement.controller.js";
import { listStockMovementsQuerySchema } from "./stockMovement.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listStockMovementsQuerySchema }),
  stockMovementController.listStockMovements
);

export const stockMovementRouter = router;
