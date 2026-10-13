import { Router } from "express";
import { validateRequest } from "../../../shared/validation/validateRequest.js";
import * as ledgerEntryController from "./ledgerEntry.controller.js";
import { listLedgerEntriesQuerySchema } from "./ledgerEntry.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest({ query: listLedgerEntriesQuerySchema }),
  ledgerEntryController.listLedgerEntries
);

export const ledgerEntryRouter = router;
