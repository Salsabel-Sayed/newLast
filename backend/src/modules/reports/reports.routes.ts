import { Router } from "express";
import { validateRequest } from "../../shared/validation/validateRequest.js";
import * as reportsController from "./reports.controller.js";
import {
  collectionsReportQuerySchema,
  expensesReportQuerySchema,
  lowStockReportQuerySchema,
  paymentsReportQuerySchema,
  profitReportQuerySchema,
  purchasesReportQuerySchema,
  returnedMixReportQuerySchema,
  salesReportQuerySchema,
  topNReportQuerySchema,
} from "./reports.validation.js";

const router = Router();

router.get(
  "/sales",
  validateRequest({ query: salesReportQuerySchema }),
  reportsController.getSalesReport
);
router.get(
  "/purchases",
  validateRequest({ query: purchasesReportQuerySchema }),
  reportsController.getPurchasesReport
);
router.get(
  "/expenses",
  validateRequest({ query: expensesReportQuerySchema }),
  reportsController.getExpensesReport
);
router.get(
  "/collections",
  validateRequest({ query: collectionsReportQuerySchema }),
  reportsController.getCollectionsReport
);
router.get(
  "/payments",
  validateRequest({ query: paymentsReportQuerySchema }),
  reportsController.getPaymentsReport
);
router.get(
  "/profit",
  validateRequest({ query: profitReportQuerySchema }),
  reportsController.getProfitReport
);
router.get(
  "/top-raw-materials",
  validateRequest({ query: topNReportQuerySchema }),
  reportsController.getTopRawMaterialsReport
);
router.get(
  "/top-recipes",
  validateRequest({ query: topNReportQuerySchema }),
  reportsController.getTopRecipesReport
);
router.get(
  "/top-customers",
  validateRequest({ query: topNReportQuerySchema }),
  reportsController.getTopCustomersReport
);
router.get(
  "/top-suppliers",
  validateRequest({ query: topNReportQuerySchema }),
  reportsController.getTopSuppliersReport
);
router.get("/current-stock", reportsController.getCurrentStockReport);
router.get("/reserved-stock", reportsController.getReservedStockReport);
router.get("/available-stock", reportsController.getAvailableStockReport);
router.get(
  "/low-stock",
  validateRequest({ query: lowStockReportQuerySchema }),
  reportsController.getLowStockReport
);
router.get("/fifo-valuation", reportsController.getFifoValuationReport);
router.get(
  "/returned-mix",
  validateRequest({ query: returnedMixReportQuerySchema }),
  reportsController.getReturnedMixReport
);

export const reportsRouter = router;
