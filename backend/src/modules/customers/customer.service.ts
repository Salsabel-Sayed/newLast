import { AppError } from "../../middlewares/Errors/appError.js";
import { guardedDelete, type DeleteOutcome } from "../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../shared/http/pagination.js";
import { escapeRegex } from "../../shared/utils/escapeRegex.js";
import { SalesOrderModel } from "../sales/sales-orders/salesOrder.model.js";
import { SalesInvoiceModel } from "../sales/sales-invoices/salesInvoice.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";
import { CustomerModel, type CustomerAttrs } from "./customer.model.js";

interface ListCustomersOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  page: number;
  limit: number;
}

export async function listCustomers(options: ListCustomersOptions) {
  const filter: Record<string, unknown> = {};

  if (options.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  if (options.search) {
    const regex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [{ code: regex }, { name: regex }];
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    CustomerModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    CustomerModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getCustomerById(id: string) {
  const customer = await CustomerModel.findById(id);
  if (!customer) {
    throw new AppError("العميل غير موجود", 404);
  }
  return customer;
}

export async function createCustomer(data: Omit<CustomerAttrs, "balance">) {
  const existing = await CustomerModel.findOne({ code: data.code });
  if (existing) {
    throw new AppError("كود العميل مستخدم بالفعل", 409);
  }
  return CustomerModel.create(data);
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<CustomerAttrs, "balance">>
) {
  if (data.code) {
    const existing = await CustomerModel.findOne({
      code: data.code,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError("كود العميل مستخدم بالفعل", 409);
    }
  }

  const customer = await CustomerModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!customer) {
    throw new AppError("العميل غير موجود", 404);
  }

  return customer;
}

export async function deleteCustomer(id: string): Promise<DeleteOutcome> {
  // Payment dependent will be added once that module exists (Phase 7)
  return guardedDelete(CustomerModel, id, [
    { model: SalesOrderModel, field: "customerId" },
    { model: SalesInvoiceModel, field: "customerId" },
    { model: ReturnModel, field: "customerId" },
  ]);
}
