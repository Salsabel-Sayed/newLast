import { Router } from "express";
import { validateRequest } from "../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../shared/validation/objectId.js";
import * as supplierController from "./supplier.controller.js";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierSchema,
} from "./supplier.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listSuppliersQuerySchema }),
  supplierController.listSuppliers
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  supplierController.getSupplier
);

router.get(
  "/:id/statement",
  validateRequest({ params: idParamSchema }),
  supplierController.getSupplierStatement
);

router.post(
  "/",
  validateRequest({ body: createSupplierSchema }),
  supplierController.createSupplier
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateSupplierSchema }),
  supplierController.updateSupplier
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  supplierController.deleteSupplier
);

export const supplierRouter = router;
