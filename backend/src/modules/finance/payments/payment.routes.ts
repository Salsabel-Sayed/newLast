import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as paymentController from "./payment.controller.js";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  voidPaymentSchema,
} from "./payment.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listPaymentsQuerySchema }),
  paymentController.listPayments
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  paymentController.getPayment
);

router.post(
  "/",
  validateRequest({ body: createPaymentSchema }),
  paymentController.createPayment
);

router.post(
  "/:id/void",
  validateRequest({ params: idParamSchema, body: voidPaymentSchema }),
  paymentController.voidPayment
);

export const paymentRouter = router;
