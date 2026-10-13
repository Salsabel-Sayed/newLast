import { AppError } from "../../../middlewares/Errors/appError.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { PurchaseInvoiceModel } from "./purchaseInvoice.model.js";

export async function getPurchaseInvoiceById(id: string) {
  const invoice = await PurchaseInvoiceModel.findById(id);
  if (!invoice) {
    throw new AppError("فاتورة الشراء غير موجودة", 404);
  }
  return invoice;
}

interface ListPurchaseInvoicesOptions {
  supplierId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listPurchaseInvoices(options: ListPurchaseInvoicesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.supplierId) filter.supplierId = options.supplierId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    PurchaseInvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    PurchaseInvoiceModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
