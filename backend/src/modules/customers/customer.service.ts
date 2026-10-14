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
import { SalesOrderModel } from "../sales/sales-orders/salesOrder.model.js";
import { SalesInvoiceModel } from "../sales/sales-invoices/salesInvoice.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";
import { LedgerEntryModel } from "../finance/ledger/ledgerEntry.model.js";
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

  const [items, total, summaryRows] = await Promise.all([
    CustomerModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit),
    CustomerModel.countDocuments(filter),
    CustomerModel.aggregate([
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

  const partiesWithOpeningBalances = await attachOpeningBalanceDetails("customer", items);
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

export async function getCustomerById(id: string) {
  const customer = await CustomerModel.findById(id);
  if (!customer) {
    throw new AppError("العميل غير موجود", 404);
  }
  const [partyWithOpeningBalance] = await attachOpeningBalanceDetails("customer", [customer]);
  return partyWithOpeningBalance;
}


interface CreateCustomerInput extends Omit<CustomerAttrs, "balance" | "openingBalanceAmount" | "openingBalanceSide" | "openingBalanceDate"> {
  openingBalanceAmount?: number;
  openingBalanceDate?: Date | string;
  openingBalanceSide?: OpeningBalanceSide;
}

export async function createCustomer(data: CreateCustomerInput) {
  const {
    openingBalanceAmount = 0,
    openingBalanceDate,
    openingBalanceSide = "they_owe_us",
    ...customerData
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
    const existing = await CustomerModel.findOne({ code: customerData.code }).session(session);
    if (existing) throw new AppError("كود العميل مستخدم بالفعل", 409);

    // Positive customer balance means the customer owes the company.
    const initialBalance = openingBalanceAmount === 0
      ? 0
      : openingBalanceSide === "they_owe_us"
        ? openingBalanceAmount
        : -openingBalanceAmount;

    const [customer] = await CustomerModel.create(
      [{ ...customerData, balance: initialBalance, openingBalanceAmount, openingBalanceSide, openingBalanceDate: effectiveOpeningBalanceDate }],
      { session }
    );
    if (!customer) throw new AppError("تعذر إنشاء العميل", 500);

    if (openingBalanceAmount > 0) {
      await recordLedgerEntry({
        partyType: "customer",
        partyId: customer._id,
        date: effectiveOpeningBalanceDate,
        sourceType: "opening_balance",
        sourceId: customer._id,
        description: "رصيد افتتاحي للعميل",
        debit: initialBalance > 0 ? openingBalanceAmount : 0,
        credit: initialBalance < 0 ? openingBalanceAmount : 0,
      }, session);
    }
    return customer;
  });
}

type UpdateCustomerInput = Partial<
  Omit<
    CustomerAttrs,
    "balance" | "openingBalanceAmount" | "openingBalanceSide" | "openingBalanceDate"
  >
> & {
  openingBalanceAmount?: number;
  openingBalanceSide?: OpeningBalanceSide;
};

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  if (data.code) {
    const existing = await CustomerModel.findOne({
      code: data.code,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError("كود العميل مستخدم بالفعل", 409);
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

  if (!openingBalanceProvided) {
    const customer = await CustomerModel.findByIdAndUpdate(id, profileData, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!customer) {
      throw new AppError("العميل غير موجود", 404);
    }
    return customer;
  }

  return withTransaction(async (session) => {
    const customer = await CustomerModel.findById(id).session(session);
    if (!customer) {
      throw new AppError("العميل غير موجود", 404);
    }

    customer.set(profileData);

    if (openingBalanceProvided) {
      const previousOpeningBalance = await getOpeningBalanceDetails(
        "customer",
        customer,
        session
      );
      const nextAmount = openingBalanceAmount!;
      const nextSide = openingBalanceSide!;
      const previousSignedAmount = signedOpeningBalanceAmount(
        "customer",
        previousOpeningBalance.openingBalanceAmount,
        previousOpeningBalance.openingBalanceSide
      );
      const nextSignedAmount = signedOpeningBalanceAmount("customer", nextAmount, nextSide);
      const balanceDelta = nextSignedAmount - previousSignedAmount;

      if (balanceDelta !== 0) {
        await recordLedgerEntry(
          {
            partyType: "customer",
            partyId: customer._id,
            date: new Date(),
            sourceType: "opening_balance_adjustment",
            sourceId: customer._id,
            description: "تعديل الرصيد الافتتاحي للعميل",
            debit: balanceDelta > 0 ? balanceDelta : 0,
            credit: balanceDelta < 0 ? -balanceDelta : 0,
          },
          session
        );
      }

      customer.openingBalanceAmount = nextAmount;
      customer.openingBalanceSide = nextSide;
      customer.openingBalanceDate =
        customer.openingBalanceDate ?? previousOpeningBalance.openingBalanceDate ?? new Date();
      customer.balance += balanceDelta;
    }

    await customer.save({ session });
    return customer;
  });
}

export async function deleteCustomer(id: string): Promise<DeleteOutcome> {
  // Payment dependent will be added once that module exists (Phase 7)
  return guardedDelete(CustomerModel, id, [
    { model: SalesOrderModel, field: "customerId" },
    { model: SalesInvoiceModel, field: "customerId" },
    { model: ReturnModel, field: "customerId" },
    { model: LedgerEntryModel, field: "partyId", filter: { partyType: "customer" } },
  ]);
}
