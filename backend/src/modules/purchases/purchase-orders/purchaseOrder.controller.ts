import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as purchaseOrderService from "./purchaseOrder.service.js";

export const listPurchaseOrders = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    supplierId?: string;
    status?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await purchaseOrderService.listPurchaseOrders({
    supplierId: query.supplierId,
    status: query.status,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getPurchaseOrder = catchError(async (req: Request, res: Response) => {
  const order = await purchaseOrderService.getPurchaseOrderById(getIdParam(req));
  sendSuccess(res, order);
});

export const createPurchaseOrder = catchError(async (req: Request, res: Response) => {
  const order = await purchaseOrderService.createPurchaseOrder(req.body);
  sendSuccess(res, order, 201);
});

export const updatePurchaseOrder = catchError(async (req: Request, res: Response) => {
  const order = await purchaseOrderService.updatePurchaseOrder(getIdParam(req), req.body);
  sendSuccess(res, order);
});

export const receivePurchaseOrder = catchError(async (req: Request, res: Response) => {
  const result = await purchaseOrderService.receivePurchaseOrder(getIdParam(req));
  sendSuccess(res, result);
});

export const cancelPurchaseOrder = catchError(async (req: Request, res: Response) => {
  const order = await purchaseOrderService.cancelPurchaseOrder(getIdParam(req));
  sendSuccess(res, order);
});
