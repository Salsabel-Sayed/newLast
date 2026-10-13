import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as returnController from "./return.controller.js";
import { createReturnSchema, listReturnsQuerySchema } from "./return.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listReturnsQuerySchema }),
  returnController.listReturns
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  returnController.getReturn
);

router.post(
  "/",
  validateRequest({ body: createReturnSchema }),
  returnController.createReturn
);

export const returnRouter = router;
