import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as salesOrderController from "./salesOrder.controller.js";
import {
  cancelSalesOrderSchema,
  createSalesOrderSchema,
  listSalesOrdersQuerySchema,
  updateSalesOrderSchema,
} from "./salesOrder.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listSalesOrdersQuerySchema }),
  salesOrderController.listSalesOrders
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  salesOrderController.getSalesOrder
);

router.post(
  "/",
  validateRequest({ body: createSalesOrderSchema }),
  salesOrderController.createSalesOrder
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateSalesOrderSchema }),
  salesOrderController.updateSalesOrder
);

router.post(
  "/:id/confirm",
  validateRequest({ params: idParamSchema }),
  salesOrderController.confirmSalesOrder
);

router.post(
  "/:id/deliver",
  validateRequest({ params: idParamSchema }),
  salesOrderController.deliverSalesOrder
);

router.post(
  "/:id/cancel",
  validateRequest({ params: idParamSchema, body: cancelSalesOrderSchema }),
  salesOrderController.cancelSalesOrder
);

export const salesOrderRouter = router;
