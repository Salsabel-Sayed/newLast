import { Router } from "express";
import { validateRequest } from "../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../shared/validation/objectId.js";
import * as customerController from "./customer.controller.js";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listCustomersQuerySchema }),
  customerController.listCustomers
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  customerController.getCustomer
);

router.get(
  "/:id/statement",
  validateRequest({ params: idParamSchema }),
  customerController.getCustomerStatement
);

router.post(
  "/",
  validateRequest({ body: createCustomerSchema }),
  customerController.createCustomer
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateCustomerSchema }),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  customerController.deleteCustomer
);

export const customerRouter = router;
