import express, { type Express } from "express";
import cors from "cors";
import { AppError } from "./middlewares/Errors/appError.js";
import { globalError } from "./middlewares/Errors/globalError.js";
import { customerRouter } from "./modules/customers/customer.routes.js";
import { supplierRouter } from "./modules/suppliers/supplier.routes.js";
import { rawMaterialCategoryRouter } from "./modules/inventory/raw-material-categories/rawMaterialCategory.routes.js";
import { rawMaterialRouter } from "./modules/inventory/raw-materials/rawMaterial.routes.js";
import { recipeCategoryRouter } from "./modules/recipes/recipe-categories/recipeCategory.routes.js";
import { batchRouter } from "./modules/inventory/batches/batch.routes.js";
import { stockMovementRouter } from "./modules/inventory/stock-movements/stockMovement.routes.js";
import { openingBalanceRouter } from "./modules/inventory/opening-balances/openingBalance.routes.js";
import { stockCorrectionRouter } from "./modules/inventory/stock-corrections/stockCorrection.routes.js";
import { purchaseOrderRouter } from "./modules/purchases/purchase-orders/purchaseOrder.routes.js";
import { purchaseInvoiceRouter } from "./modules/purchases/purchase-invoices/purchaseInvoice.routes.js";
import { recipeRouter } from "./modules/recipes/recipes/recipe.routes.js";
import { salesOrderRouter } from "./modules/sales/sales-orders/salesOrder.routes.js";
import { salesInvoiceRouter } from "./modules/sales/sales-invoices/salesInvoice.routes.js";
import { returnRouter } from "./modules/returns/returns/return.routes.js";
import { returnedMixBatchRouter } from "./modules/returns/returned-mixes/returnedMixBatch.routes.js";
import { paymentRouter } from "./modules/finance/payments/payment.routes.js";
import { expenseRouter } from "./modules/finance/expenses/expense.routes.js";
import { ledgerEntryRouter } from "./modules/finance/ledger/ledgerEntry.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/customers", customerRouter);
  app.use("/api/suppliers", supplierRouter);
  app.use("/api/raw-material-categories", rawMaterialCategoryRouter);
  app.use("/api/raw-materials", rawMaterialRouter);
  app.use("/api/recipe-categories", recipeCategoryRouter);
  app.use("/api/batches", batchRouter);
  app.use("/api/stock-movements", stockMovementRouter);
  app.use("/api/opening-balances", openingBalanceRouter);
  app.use("/api/stock-corrections", stockCorrectionRouter);
  app.use("/api/purchase-orders", purchaseOrderRouter);
  app.use("/api/purchase-invoices", purchaseInvoiceRouter);
  app.use("/api/recipes", recipeRouter);
  app.use("/api/sales-orders", salesOrderRouter);
  app.use("/api/sales-invoices", salesInvoiceRouter);
  app.use("/api/returns", returnRouter);
  app.use("/api/returned-mixes", returnedMixBatchRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/expenses", expenseRouter);
  app.use("/api/ledger", ledgerEntryRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/settings", settingsRouter);

  app.use((_req, _res, next) => {
    next(new AppError("المسار المطلوب غير موجود", 404));
  });

  app.use(globalError);

  return app;
}
