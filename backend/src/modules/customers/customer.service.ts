import { AppError } from "../../middlewares/Errors/appError.js";
import { withTransaction } from "../../shared/database/withTransaction.js";
import { recordLedgerEntry } from "../finance/ledger/ledgerEntry.service.js";
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

type OpeningBalanceSide = "they_owe_us" | "we_owe_them";

interface CreateCustomerInput extends Omit<CustomerAttrs, "balance"> {
  openingBalanceAmount?: number;
  openingBalanceSide?: OpeningBalanceSide;
}

export async function createCustomer(data: CreateCustomerInput) {
  const {
    openingBalanceAmount = 0,
    openingBalanceSide = "they_owe_us",
    ...customerData
  } = data;

  const hasMoreThanTwoDecimals =
    Math.abs(openingBalanceAmount * 100 - Math.round(openingBalanceAmount * 100)) > 1e-7;
  if (!Number.isFinite(openingBalanceAmount) || openingBalanceAmount < 0 || hasMoreThanTwoDecimals) {
    throw new AppError("قيمة الرصيد الافتتاحي غير صحيحة (بحد أقصى منزلتين عشريتين)", 400);
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
      [{ ...customerData, balance: initialBalance }],
      { session }
    );
    if (!customer) throw new AppError("تعذر إنشاء العميل", 500);

    if (openingBalanceAmount > 0) {
      await recordLedgerEntry({
        partyType: "customer",
        partyId: customer._id,
        date: new Date(),
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
    { model: LedgerEntryModel, field: "partyId", filter: { partyType: "customer" } },
  ]);
}
