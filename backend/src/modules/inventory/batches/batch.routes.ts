import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as batchController from "./batch.controller.js";
import { listBatchesQuerySchema, updateBatchSchema } from "./batch.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listBatchesQuerySchema }),
  batchController.listBatches
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  batchController.getBatch
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateBatchSchema }),
  batchController.updateBatch
);

export const batchRouter = router;
