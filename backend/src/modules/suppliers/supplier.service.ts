import { AppError } from "../../middlewares/Errors/appError.js";
import { withTransaction } from "../../shared/database/withTransaction.js";
import { recordLedgerEntry } from "../finance/ledger/ledgerEntry.service.js";
import {
  attachOpeningBalanceDetails,
  getOpeningBalanceDetails,
  signedOpeningBalanceAmount,
  type OpeningBalanceSide,
} from "../finance/ledger/openingBalance.service.js";
import { guardedDelete, type DeleteOutcome } from "../../shared/database/guardedDelete.js";
import { buildPaginatedResult } from "../../shared/http/pagination.js";
import { escapeRegex } from "../../shared/utils/escapeRegex.js";
import { PurchaseOrderModel } from "../purchases/purchase-orders/purchaseOrder.model.js";
import { PurchaseInvoiceModel } from "../purchases/purchase-invoices/purchaseInvoice.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";
import { LedgerEntryModel } from "../finance/ledger/ledgerEntry.model.js";
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

  const [items, total, summaryRows] = await Promise.all([
    SupplierModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    SupplierModel.countDocuments(filter),
    SupplierModel.aggregate([
      {
        $group: {
          _id: null,
          positiveBalanceTotal: {
            $sum: { $cond: [{ $gt: ["$balance", 0] }, "$balance", 0] },
          },
          negativeBalanceTotal: {
            $sum: { $cond: [{ $lt: ["$balance", 0] }, { $multiply: ["$balance", -1] }, 0] },
          },
          netBalance: { $sum: "$balance" },
        },
      },
    ]),
  ]);

  const partiesWithOpeningBalances = await attachOpeningBalanceDetails("supplier", items);
  const summary = summaryRows[0] ?? {
    positiveBalanceTotal: 0,
    negativeBalanceTotal: 0,
    netBalance: 0,
  };

  return {
    ...buildPaginatedResult(partiesWithOpeningBalances, total, options.page, options.limit),
    summary: {
      positiveBalanceTotal: summary.positiveBalanceTotal,
      negativeBalanceTotal: summary.negativeBalanceTotal,
      netBalance: summary.netBalance,
    },
  };
}

export async function getSupplierById(id: string) {
  const supplier = await SupplierModel.findById(id);
  if (!supplier) {
    throw new AppError("المورد غير موجود", 404);
  }
  const [partyWithOpeningBalance] = await attachOpeningBalanceDetails("supplier", [supplier]);
  return partyWithOpeningBalance;
}


interface CreateSupplierInput extends Omit<SupplierAttrs, "balance" | "openingBalanceAmount" | "openingBalanceSide" | "openingBalanceDate"> {
  openingBalanceAmount?: number;
  openingBalanceDate?: Date | string;
  openingBalanceSide?: OpeningBalanceSide;
}

export async function createSupplier(data: CreateSupplierInput) {
  const {
    openingBalanceAmount = 0,
    openingBalanceDate,
    openingBalanceSide = "they_owe_us",
    ...supplierData
  } = data;

  const hasMoreThanTwoDecimals =
    Math.abs(openingBalanceAmount * 100 - Math.round(openingBalanceAmount * 100)) > 1e-7;
  if (!Number.isFinite(openingBalanceAmount) || openingBalanceAmount < 0 || hasMoreThanTwoDecimals) {
    throw new AppError("قيمة الرصيد الافتتاحي غير صحيحة (بحد أقصى منزلتين عشريتين)", 400);
  }

  const effectiveOpeningBalanceDate =
    openingBalanceDate === undefined ? new Date() : new Date(openingBalanceDate);
  if (Number.isNaN(effectiveOpeningBalanceDate.getTime())) {
    throw new AppError("تاريخ الرصيد الافتتاحي غير صحيح", 400);
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
      [{ ...supplierData, balance: initialBalance, openingBalanceAmount, openingBalanceSide, openingBalanceDate: effectiveOpeningBalanceDate }],
      { session }
    );
    if (!supplier) throw new AppError("تعذر إنشاء المورد", 500);

    if (openingBalanceAmount > 0) {
      await recordLedgerEntry({
        partyType: "supplier",
        partyId: supplier._id,
        date: effectiveOpeningBalanceDate,
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

type UpdateSupplierInput = Partial<
  Omit<
    SupplierAttrs,
    "balance" | "openingBalanceAmount" | "openingBalanceSide" | "openingBalanceDate"
  >
> & {
  openingBalanceAmount?: number;
  openingBalanceSide?: OpeningBalanceSide;
};

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  if (data.code) {
    const existing = await SupplierModel.findOne({
      code: data.code,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError("كود المورد مستخدم بالفعل", 409);
    }
  }

  const {
    openingBalanceAmount,
    openingBalanceSide,
    ...profileData
  } = data;
  const openingBalanceProvided =
    openingBalanceAmount !== undefined || openingBalanceSide !== undefined;

  if (
    openingBalanceProvided &&
    (openingBalanceAmount === undefined || openingBalanceSide === undefined)
  ) {
    throw new AppError("يجب تحديد قيمة الرصيد وطبيعته معًا", 400);
  }

  if (openingBalanceAmount !== undefined) {
    const hasMoreThanTwoDecimals =
      Math.abs(openingBalanceAmount * 100 - Math.round(openingBalanceAmount * 100)) > 1e-7;
    if (!Number.isFinite(openingBalanceAmount) || openingBalanceAmount < 0 || hasMoreThanTwoDecimals) {
      throw new AppError("قيمة الرصيد الافتتاحي غير صحيحة (بحد أقصى منزلتين عشريتين)", 400);
    }
  }

  return withTransaction(async (session) => {
    const supplier = await SupplierModel.findById(id).session(session);
    if (!supplier) {
      throw new AppError("المورد غير موجود", 404);
    }

    supplier.set(profileData);

    if (openingBalanceProvided) {
      const previousOpeningBalance = await getOpeningBalanceDetails(
        "supplier",
        supplier,
        session
      );
      const nextAmount = openingBalanceAmount!;
      const nextSide = openingBalanceSide!;
      const previousSignedAmount = signedOpeningBalanceAmount(
        "supplier",
        previousOpeningBalance.openingBalanceAmount,
        previousOpeningBalance.openingBalanceSide
      );
      const nextSignedAmount = signedOpeningBalanceAmount("supplier", nextAmount, nextSide);
      const balanceDelta = nextSignedAmount - previousSignedAmount;

      if (balanceDelta !== 0) {
        await recordLedgerEntry(
          {
            partyType: "supplier",
            partyId: supplier._id,
            date: new Date(),
            sourceType: "opening_balance_adjustment",
            sourceId: supplier._id,
            description: "تعديل الرصيد الافتتاحي للمورد",
            debit: balanceDelta < 0 ? -balanceDelta : 0,
            credit: balanceDelta > 0 ? balanceDelta : 0,
          },
          session
        );
      }

      supplier.openingBalanceAmount = nextAmount;
      supplier.openingBalanceSide = nextSide;
      supplier.openingBalanceDate =
        supplier.openingBalanceDate ?? previousOpeningBalance.openingBalanceDate ?? new Date();
      supplier.balance += balanceDelta;
    }

    await supplier.save({ session });
    return supplier;
  });
}

export async function deleteSupplier(id: string): Promise<DeleteOutcome> {
  // Payment dependent will be added once that module exists (Phase 7)
  return guardedDelete(SupplierModel, id, [
    { model: PurchaseOrderModel, field: "supplierId" },
    { model: PurchaseInvoiceModel, field: "supplierId" },
    { model: ReturnModel, field: "supplierId" },
    { model: LedgerEntryModel, field: "partyId", filter: { partyType: "supplier" } },
  ]);
}
