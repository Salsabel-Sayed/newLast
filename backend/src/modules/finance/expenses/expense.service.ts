import { AppError } from "../../../middlewares/Errors/appError.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { SalesOrderModel } from "../../sales/sales-orders/salesOrder.model.js";
import { ExpenseModel } from "./expense.model.js";

export interface CreateExpenseInput {
  category: string;
  amount: number;
  expenseDate: Date;
  description: string;
  linkedSalesOrderId?: string;
  notes?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

async function assertSalesOrderExists(id: string) {
  const order = await SalesOrderModel.findById(id);
  if (!order) {
    throw new AppError("أمر البيع المرتبط غير موجود", 404);
  }
}

export async function createExpense(input: CreateExpenseInput) {
  if (input.linkedSalesOrderId) {
    await assertSalesOrderExists(input.linkedSalesOrderId);
  }

  const expenseNumber = await getNextSequenceNumber("EXP");

  return ExpenseModel.create({
    expenseNumber,
    category: input.category,
    amount: input.amount,
    expenseDate: input.expenseDate,
    description: input.description,
    ...(input.linkedSalesOrderId ? { linkedSalesOrderId: input.linkedSalesOrderId } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  if (input.linkedSalesOrderId) {
    await assertSalesOrderExists(input.linkedSalesOrderId);
  }

  const expense = await ExpenseModel.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!expense) {
    throw new AppError("المصروف غير موجود", 404);
  }

  return expense;
}

export async function getExpenseById(id: string) {
  const expense = await ExpenseModel.findById(id);
  if (!expense) {
    throw new AppError("المصروف غير موجود", 404);
  }
  return expense;
}

interface ListExpensesOptions {
  category?: string | undefined;
  linkedSalesOrderId?: string | undefined;
  page: number;
  limit: number;
}

export async function listExpenses(options: ListExpensesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.category) filter.category = options.category;
  if (options.linkedSalesOrderId) filter.linkedSalesOrderId = options.linkedSalesOrderId;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    ExpenseModel.find(filter).sort({ expenseDate: -1 }).skip(skip).limit(options.limit),
    ExpenseModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
