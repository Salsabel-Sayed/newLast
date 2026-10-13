import type { Request, Response } from "express";
import { catchError } from "../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";
import { getIdParam } from "../../shared/http/getIdParam.js";
import { parsePagination } from "../../shared/http/pagination.js";
import { getPartyStatement } from "../finance/ledger/ledgerEntry.service.js";
import * as customerService from "./customer.service.js";

export const listCustomers = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    search?: string;
    isActive?: "true" | "false";
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await customerService.listCustomers({
    search: query.search,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getCustomer = catchError(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(getIdParam(req));
  sendSuccess(res, customer);
});

export const createCustomer = catchError(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body);
  sendSuccess(res, customer, 201);
});

export const updateCustomer = catchError(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(getIdParam(req), req.body);
  sendSuccess(res, customer);
});

export const deleteCustomer = catchError(async (req: Request, res: Response) => {
  const outcome = await customerService.deleteCustomer(getIdParam(req));
  sendSuccess(res, { outcome });
});

export const getCustomerStatement = catchError(async (req: Request, res: Response) => {
  const id = getIdParam(req);
  await customerService.getCustomerById(id);
  const statement = await getPartyStatement("customer", id);
  sendSuccess(res, statement);
});
