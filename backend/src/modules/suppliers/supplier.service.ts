import { AppError } from "../../middlewares/Errors/appError.js";
import { withTransaction } from "../../shared/database/withTransaction.js";
import { recordLedgerEntry } from "../finance/ledger/ledgerEntry.service.js";
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

type OpeningBalanceSide = "they_owe_us" | "we_owe_them";

interface CreateSupplierInput extends Omit<SupplierAttrs, "balance"> {
  openingBalanceAmount?: number;
  openingBalanceSide?: OpeningBalanceSide;
}

export async function createSupplier(data: CreateSupplierInput) {
  const {
    openingBalanceAmount = 0,
    openingBalanceSide = "they_owe_us",
    ...supplierData
  } = data;

  if (!Number.isFinite(openingBalanceAmount) || openingBalanceAmount < 0) {
    throw new AppError("قيمة الرصيد الافتتاحي غير صحيحة", 400);
  }

  return withTransaction(async (session) => {
    const existing = await SupplierModel.findOne({ code: supplierData.code }).session(session);
    if (existing) throw new AppError("كود المورد مستخدم بالفعل", 409);

    // Positive supplier balance means the company owes the supplier.
    const initialBalance = openingBalanceAmount === 0
      ? 0
      : openingBalanceSide === "we_owe_them"
        ? openingBalanceAmount
        : -openingBalanceAmount;

    const [supplier] = await SupplierModel.create(
      [{ ...supplierData, balance: initialBalance }],
      { session }
    );
    if (!supplier) throw new AppError("تعذر إنشاء المورد", 500);

    if (openingBalanceAmount > 0) {
      await recordLedgerEntry({
        partyType: "supplier",
        partyId: supplier._id,
        date: new Date(),
        sourceType: "opening_balance",
        sourceId: supplier._id,
        description: "رصيد افتتاحي للمورد",
        debit: initialBalance < 0 ? openingBalanceAmount : 0,
        credit: initialBalance > 0 ? openingBalanceAmount : 0,
      }, session);
    }
    return supplier;
  });
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
