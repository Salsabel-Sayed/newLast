import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { getIdParam } from "../../../shared/http/getIdParam.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as returnService from "./return.service.js";

export const listReturns = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    returnType?: string;
    customerId?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await returnService.listReturns({
    returnType: query.returnType,
    customerId: query.customerId,
    supplierId: query.supplierId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getReturn = catchError(async (req: Request, res: Response) => {
  const returnDoc = await returnService.getReturnById(getIdParam(req));
  sendSuccess(res, returnDoc);
});

export const createReturn = catchError(async (req: Request, res: Response) => {
  const returnDoc = await returnService.createReturn(req.body);
  sendSuccess(res, returnDoc, 201);
});
