import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as expenseService from "./expense.service.js";

export const listExpenses = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    category?: string;
    linkedSalesOrderId?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await expenseService.listExpenses({
    category: query.category,
    linkedSalesOrderId: query.linkedSalesOrderId,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getExpense = catchError(async (req: Request, res: Response) => {
  const expense = await expenseService.getExpenseById(getIdParam(req));
  sendSuccess(res, expense);
});

export const createExpense = catchError(async (req: Request, res: Response) => {
  const expense = await expenseService.createExpense(req.body);
  sendSuccess(res, expense, 201);
});

export const updateExpense = catchError(async (req: Request, res: Response) => {
  const expense = await expenseService.updateExpense(getIdParam(req), req.body);
  sendSuccess(res, expense);
});
