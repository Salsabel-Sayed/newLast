import type { Request, Response } from "express";
import { catchError } from "../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";
import { getIdParam } from "../../shared/http/getIdParam.js";
import { parsePagination } from "../../shared/http/pagination.js";
import { getPartyStatement } from "../finance/ledger/ledgerEntry.service.js";
import * as supplierService from "./supplier.service.js";

export const listSuppliers = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    search?: string;
    isActive?: "true" | "false";
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await supplierService.listSuppliers({
    search: query.search,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    page,
    limit,
  });

  sendSuccess(res, result);
});

export const getSupplier = catchError(async (req: Request, res: Response) => {
  const supplier = await supplierService.getSupplierById(getIdParam(req));
  sendSuccess(res, supplier);
});

export const createSupplier = catchError(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.body);
  sendSuccess(res, supplier, 201);
});

export const updateSupplier = catchError(async (req: Request, res: Response) => {
  const supplier = await supplierService.updateSupplier(getIdParam(req), req.body);
  sendSuccess(res, supplier);
});

export const deleteSupplier = catchError(async (req: Request, res: Response) => {
  const outcome = await supplierService.deleteSupplier(getIdParam(req));
  sendSuccess(res, { outcome });
});

export const getSupplierStatement = catchError(async (req: Request, res: Response) => {
  const id = getIdParam(req);
  await supplierService.getSupplierById(id);
  const statement = await getPartyStatement("supplier", id);
  sendSuccess(res, statement);
});
