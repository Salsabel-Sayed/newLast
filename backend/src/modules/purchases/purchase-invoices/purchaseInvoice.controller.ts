import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as purchaseInvoiceService from "./purchaseInvoice.service.js";

export const listPurchaseInvoices = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    supplierId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await purchaseInvoiceService.listPurchaseInvoices({
    supplierId: query.supplierId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getPurchaseInvoice = catchError(async (req: Request, res: Response) => {
  const invoice = await purchaseInvoiceService.getPurchaseInvoiceById(getIdParam(req));
  sendSuccess(res, invoice);
});
