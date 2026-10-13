import type { Model } from "mongoose";
import { AppError } from "../../middlewares/Errors/appError.js";
import { withTransaction } from "../../shared/database/withTransaction.js";
import { NumberSequenceModel } from "../../shared/numberSequence/numberSequence.model.js";
import { CustomerModel } from "../customers/customer.model.js";
import { SupplierModel } from "../suppliers/supplier.model.js";
import { RawMaterialModel } from "../inventory/raw-materials/rawMaterial.model.js";
import { RawMaterialCategoryModel } from "../inventory/raw-material-categories/rawMaterialCategory.model.js";
import { BatchModel } from "../inventory/batches/batch.model.js";
import { StockMovementModel } from "../inventory/stock-movements/stockMovement.model.js";
import { OpeningBalanceModel } from "../inventory/opening-balances/openingBalance.model.js";
import { StockCorrectionModel } from "../inventory/stock-corrections/stockCorrection.model.js";
import { RecipeModel } from "../recipes/recipes/recipe.model.js";
import { RecipeCategoryModel } from "../recipes/recipe-categories/recipeCategory.model.js";
import { PurchaseOrderModel } from "../purchases/purchase-orders/purchaseOrder.model.js";
import { PurchaseInvoiceModel } from "../purchases/purchase-invoices/purchaseInvoice.model.js";
import { SalesOrderModel } from "../sales/sales-orders/salesOrder.model.js";
import { SalesInvoiceModel } from "../sales/sales-invoices/salesInvoice.model.js";
import { ReturnModel } from "../returns/returns/return.model.js";
import { ReturnedMixBatchModel } from "../returns/returned-mixes/returnedMixBatch.model.js";
import { PaymentModel } from "../finance/payments/payment.model.js";
import { ExpenseModel } from "../finance/expenses/expense.model.js";
import { LedgerEntryModel } from "../finance/ledger/ledgerEntry.model.js";
import { SettingsModel, type SettingsAttrs } from "./settings.model.js";

export async function getSettings() {
  const existing = await SettingsModel.findOne();
  if (existing) return existing;
  return SettingsModel.create({});
}

export type UpdateSettingsInput = Partial<SettingsAttrs>;

export async function updateSettings(input: UpdateSettingsInput) {
  const settings = await getSettings();

  if (settings.systemInitialized && input.systemInitialized === false) {
    throw new AppError(
      "لا يمكن التراجع عن بدء الاستخدام الفعلي للنظام بعد تفعيله",
      409
    );
  }

  if (input.companyName !== undefined) settings.companyName = input.companyName;
  if (input.currency !== undefined) settings.currency = input.currency;
  if (input.defaultTaxPercent !== undefined) {
    settings.defaultTaxPercent = input.defaultTaxPercent;
  }
  if (input.systemInitialized !== undefined) {
    settings.systemInitialized = input.systemInitialized;
  }
  if (input.allowPermanentDelete !== undefined) {
    settings.allowPermanentDelete = input.allowPermanentDelete;
  }

  // Permanent-delete tools are a trial-only concept; once real use begins they are locked off.
  if (settings.systemInitialized) {
    settings.allowPermanentDelete = false;
  }

  await settings.save();
  return settings;
}

async function assertPermanentDeleteAllowed(): Promise<void> {
  const settings = await getSettings();
  if (!settings.allowPermanentDelete) {
    throw new AppError(
      "أدوات الحذف الدائم غير متاحة إلا أثناء مرحلة التجربة (allowPermanentDelete)",
      403
    );
  }
}

const CATALOG_MODELS: Model<any>[] = [
  CustomerModel,
  SupplierModel,
  RawMaterialModel,
  RawMaterialCategoryModel,
  RecipeModel,
  RecipeCategoryModel,
];

const TRANSACTIONAL_MODELS: Model<any>[] = [
  BatchModel,
  StockMovementModel,
  OpeningBalanceModel,
  StockCorrectionModel,
  PurchaseOrderModel,
  PurchaseInvoiceModel,
  SalesOrderModel,
  SalesInvoiceModel,
  ReturnModel,
  ReturnedMixBatchModel,
  PaymentModel,
  ExpenseModel,
  LedgerEntryModel,
  NumberSequenceModel,
];

export async function fullDatabaseReset(): Promise<void> {
  await assertPermanentDeleteAllowed();

  await withTransaction(async (session) => {
    for (const model of [...CATALOG_MODELS, ...TRANSACTIONAL_MODELS]) {
      await model.deleteMany({}, { session });
    }
  });
}

export async function transactionsReset(): Promise<void> {
  await assertPermanentDeleteAllowed();

  await withTransaction(async (session) => {
    for (const model of TRANSACTIONAL_MODELS) {
      await model.deleteMany({}, { session });
    }
    await CustomerModel.updateMany({}, { $set: { balance: 0 } }, { session });
    await SupplierModel.updateMany({}, { $set: { balance: 0 } }, { session });
  });
}

export async function resetNumberSequences(): Promise<void> {
  await assertPermanentDeleteAllowed();
  await NumberSequenceModel.deleteMany({});
}
