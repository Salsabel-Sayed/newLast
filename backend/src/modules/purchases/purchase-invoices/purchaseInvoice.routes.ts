import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as purchaseInvoiceController from "./purchaseInvoice.controller.js";
import { listPurchaseInvoicesQuerySchema } from "./purchaseInvoice.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listPurchaseInvoicesQuerySchema }),
  purchaseInvoiceController.listPurchaseInvoices
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  purchaseInvoiceController.getPurchaseInvoice
);

export const purchaseInvoiceRouter = router;
