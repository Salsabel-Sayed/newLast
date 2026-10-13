import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as salesOrderService from "./salesOrder.service.js";

export const listSalesOrders = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    customerId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await salesOrderService.listSalesOrders({
    customerId: query.customerId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getSalesOrder = catchError(async (req: Request, res: Response) => {
  const order = await salesOrderService.getSalesOrderById(getIdParam(req));
  sendSuccess(res, order);
});

export const createSalesOrder = catchError(async (req: Request, res: Response) => {
  const order = await salesOrderService.createSalesOrder(req.body);
  sendSuccess(res, order, 201);
});

export const updateSalesOrder = catchError(async (req: Request, res: Response) => {
  const order = await salesOrderService.updateSalesOrder(getIdParam(req), req.body);
  sendSuccess(res, order);
});

export const confirmSalesOrder = catchError(async (req: Request, res: Response) => {
  const order = await salesOrderService.confirmSalesOrder(getIdParam(req));
  sendSuccess(res, order);
});

export const deliverSalesOrder = catchError(async (req: Request, res: Response) => {
  const result = await salesOrderService.deliverSalesOrder(getIdParam(req));
  sendSuccess(res, result);
});

export const cancelSalesOrder = catchError(async (req: Request, res: Response) => {
  const order = await salesOrderService.cancelSalesOrder(
    getIdParam(req),
    req.body.cancellationReason
  );
  sendSuccess(res, order);
});
