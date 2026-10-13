import { AppError } from "../../middlewares/Errors/appError.js";
import { guardedDelete, type DeleteOutcome } from "../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../shared/http/pagination.js";
import { escapeRegex } from "../../shared/utils/escapeRegex.js";
import { PurchaseOrderModel } from "../purchases/purchase-orders/purchaseOrder.model.js";
import { PurchaseInvoiceModel } from "../purchases/purchase-invoices/purchaseInvoice.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";
import { SupplierModel, type SupplierAttrs } from "./supplier.model.js";

interface ListSuppliersOptions {
  search?: string | undefined;
  isActive?: boolean | undefined;
  page: number;
  limit: number;
}

export async function listSuppliers(options: ListSuppliersOptions) {
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
    SupplierModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    SupplierModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export async function getSupplierById(id: string) {
  const supplier = await SupplierModel.findById(id);
  if (!supplier) {
    throw new AppError("المورد غير موجود", 404);
  }
  return supplier;
}

export async function createSupplier(data: Omit<SupplierAttrs, "balance">) {
  const existing = await SupplierModel.findOne({ code: data.code });
  if (existing) {
    throw new AppError("كود المورد مستخدم بالفعل", 409);
  }
  return SupplierModel.create(data);
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<SupplierAttrs, "balance">>
) {
  if (data.code) {
    const existing = await SupplierModel.findOne({
      code: data.code,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError("كود المورد مستخدم بالفعل", 409);
    }
  }

  const supplier = await SupplierModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!supplier) {
    throw new AppError("المورد غير موجود", 404);
  }

  return supplier;
}

export async function deleteSupplier(id: string): Promise<DeleteOutcome> {
  // Payment dependent will be added once that module exists (Phase 7)
  return guardedDelete(SupplierModel, id, [
    { model: PurchaseOrderModel, field: "supplierId" },
    { model: PurchaseInvoiceModel, field: "supplierId" },
    { model: ReturnModel, field: "supplierId" },
  ]);
}
