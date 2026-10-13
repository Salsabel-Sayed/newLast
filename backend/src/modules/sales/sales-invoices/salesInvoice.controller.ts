import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as salesInvoiceService from "./salesInvoice.service.js";

export const listSalesInvoices = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    customerId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await salesInvoiceService.listSalesInvoices({
    customerId: query.customerId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getSalesInvoice = catchError(async (req: Request, res: Response) => {
  const invoice = await salesInvoiceService.getSalesInvoiceById(getIdParam(req));
  sendSuccess(res, invoice);
});
