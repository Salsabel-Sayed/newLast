import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as purchaseOrderController from "./purchaseOrder.controller.js";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  updatePurchaseOrderSchema,
} from "./purchaseOrder.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listPurchaseOrdersQuerySchema }),
  purchaseOrderController.listPurchaseOrders
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  purchaseOrderController.getPurchaseOrder
);

router.post(
  "/",
  validateRequest({ body: createPurchaseOrderSchema }),
  purchaseOrderController.createPurchaseOrder
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updatePurchaseOrderSchema }),
  purchaseOrderController.updatePurchaseOrder
);

router.post(
  "/:id/receive",
  validateRequest({ params: idParamSchema }),
  purchaseOrderController.receivePurchaseOrder
);

router.post(
  "/:id/cancel",
  validateRequest({ params: idParamSchema }),
  purchaseOrderController.cancelPurchaseOrder
);

export const purchaseOrderRouter = router;
