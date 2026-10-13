import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as salesInvoiceController from "./salesInvoice.controller.js";
import { listSalesInvoicesQuerySchema } from "./salesInvoice.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listSalesInvoicesQuerySchema }),
  salesInvoiceController.listSalesInvoices
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  salesInvoiceController.getSalesInvoice
);

export const salesInvoiceRouter = router;
