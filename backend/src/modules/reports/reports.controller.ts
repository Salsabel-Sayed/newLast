import type { Request, Response } from "express";
import { catchError } from "../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";
import * as reportsService from "./reports.service.js";

interface DateRangeQuery {
  dateFrom?: string;
  dateTo?: string;
}

export const getSalesReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { customerId?: string };
  const result = await reportsService.getSalesReport(query);
  sendSuccess(res, result);
});

export const getPurchasesReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { supplierId?: string };
  const result = await reportsService.getPurchasesReport(query);
  sendSuccess(res, result);
});

export const getExpensesReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { category?: string };
  const result = await reportsService.getExpensesReport(query);
  sendSuccess(res, result);
});

export const getCollectionsReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { customerId?: string };
  const result = await reportsService.getCollectionsReport(query);
  sendSuccess(res, result);
});

export const getPaymentsReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { supplierId?: string };
  const result = await reportsService.getPaymentsReport(query);
  sendSuccess(res, result);
});

export const getProfitReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery;
  const result = await reportsService.getProfitReport(query);
  sendSuccess(res, result);
});

const TOP_N_DEFAULT_LIMIT = 10;

export const getTopRawMaterialsReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { limit?: number };
  const result = await reportsService.getTopRawMaterialsReport({
    ...query,
    limit: query.limit ?? TOP_N_DEFAULT_LIMIT,
  });
  sendSuccess(res, result);
});

export const getTopRecipesReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { limit?: number };
  const result = await reportsService.getTopRecipesReport({
    ...query,
    limit: query.limit ?? TOP_N_DEFAULT_LIMIT,
  });
  sendSuccess(res, result);
});

export const getTopCustomersReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { limit?: number };
  const result = await reportsService.getTopCustomersReport({
    ...query,
    limit: query.limit ?? TOP_N_DEFAULT_LIMIT,
  });
  sendSuccess(res, result);
});

export const getTopSuppliersReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as DateRangeQuery & { limit?: number };
  const result = await reportsService.getTopSuppliersReport({
    ...query,
    limit: query.limit ?? TOP_N_DEFAULT_LIMIT,
  });
  sendSuccess(res, result);
});

export const getCurrentStockReport = catchError(async (_req: Request, res: Response) => {
  const result = await reportsService.getCurrentStockReport();
  sendSuccess(res, result);
});

export const getReservedStockReport = catchError(async (_req: Request, res: Response) => {
  const result = await reportsService.getReservedStockReport();
  sendSuccess(res, result);
});

export const getAvailableStockReport = catchError(async (_req: Request, res: Response) => {
  const result = await reportsService.getAvailableStockReport();
  sendSuccess(res, result);
});

export const getLowStockReport = catchError(async (_req: Request, res: Response) => {
  const result = await reportsService.getLowStockReport();
  sendSuccess(res, result);
});

export const getFifoValuationReport = catchError(async (_req: Request, res: Response) => {
  const result = await reportsService.getFifoValuationReport();
  sendSuccess(res, result);
});

export const getReturnedMixReport = catchError(async (req: Request, res: Response) => {
  const query = req.query as { recipeId?: string };
  const result = await reportsService.getReturnedMixReport(query);
  sendSuccess(res, result);
});
