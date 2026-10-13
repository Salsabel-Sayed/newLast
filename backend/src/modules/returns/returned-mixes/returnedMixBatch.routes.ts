import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as returnedMixBatchController from "./returnedMixBatch.controller.js";
import {
  convertToLossSchema,
  listReturnedMixBatchesQuerySchema,
} from "./returnedMixBatch.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listReturnedMixBatchesQuerySchema }),
  returnedMixBatchController.listReturnedMixBatches
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  returnedMixBatchController.getReturnedMixBatch
);

router.put(
  "/:id/loss",
  validateRequest({ params: idParamSchema, body: convertToLossSchema }),
  returnedMixBatchController.convertReturnedMixToLoss
);

export const returnedMixBatchRouter = router;
