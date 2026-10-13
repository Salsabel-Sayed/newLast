import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as openingBalanceController from "./openingBalance.controller.js";
import {
  createOpeningBalanceSchema,
  listOpeningBalancesQuerySchema,
} from "./openingBalance.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listOpeningBalancesQuerySchema }),
  openingBalanceController.listOpeningBalances
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  openingBalanceController.getOpeningBalance
);

router.post(
  "/",
  validateRequest({ body: createOpeningBalanceSchema }),
  openingBalanceController.createOpeningBalance
);

router.post(
  "/:id/post",
  validateRequest({ params: idParamSchema }),
  openingBalanceController.postOpeningBalance
);

export const openingBalanceRouter = router;
