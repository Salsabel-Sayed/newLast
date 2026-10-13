import { AppError } from "../../../middlewares/Errors/appError.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { SalesInvoiceModel } from "./salesInvoice.model.js";

export async function getSalesInvoiceById(id: string) {
  const invoice = await SalesInvoiceModel.findById(id);
  if (!invoice) {
    throw new AppError("فاتورة البيع غير موجودة", 404);
  }
  return invoice;
}

interface ListSalesInvoicesOptions {
  customerId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listSalesInvoices(options: ListSalesInvoicesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.customerId) filter.customerId = options.customerId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    SalesInvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    SalesInvoiceModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
