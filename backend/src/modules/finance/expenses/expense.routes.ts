import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import { idParamSchema } from "../../../shared/validation/objectId.js";
import * as expenseController from "./expense.controller.js";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expense.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listExpensesQuerySchema }),
  expenseController.listExpenses
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  expenseController.getExpense
);

router.post(
  "/",
  validateRequest({ body: createExpenseSchema }),
  expenseController.createExpense
);

router.put(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateExpenseSchema }),
  expenseController.updateExpense
);

export const expenseRouter = router;
