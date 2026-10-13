import type { Request, Response } from "express";
import { catchError } from "../../../middlewares/Errors/catchError.js";
import { sendSuccess } from "../../../shared/http/apiResponse.js";
import { parsePagination } from "../../../shared/http/pagination.js";
import * as ledgerEntryService from "./ledgerEntry.service.js";

export const listLedgerEntries = catchError(async (req: Request, res: Response) => {
  const query = req.query as {
    partyType?: string;
    partyId?: string;
    sourceType?: string;
    page?: string;
    limit?: string;
  };
  const { page, limit } = parsePagination(query);

  const result = await ledgerEntryService.listLedgerEntries({
    partyType: query.partyType,
    partyId: query.partyId,
    sourceType: query.sourceType,
    page,
    limit,
  });

  sendSuccess(res, result);
});
