import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as paymentService from "./payment.service.js";

export const listPayments = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    direction?: string;
    customerId?: string;
    supplierId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await paymentService.listPayments({
    direction: query.direction,
    customerId: query.customerId,
    supplierId: query.supplierId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getPayment = catchError(async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentById(getIdParam(req));
  sendSuccess(res, payment);
});

export const createPayment = catchError(async (req: Request, res: Response) => {
  const payment = await paymentService.createPayment(req.body);
  sendSuccess(res, payment, 201);
});

export const voidPayment = catchError(async (req: Request, res: Response) => {
  const payment = await paymentService.voidPayment(getIdParam(req), req.body.voidReason);
  sendSuccess(res, payment);
});
