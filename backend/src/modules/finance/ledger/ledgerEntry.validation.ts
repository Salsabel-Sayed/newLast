import Joi from "joi";
import { objectIdSchema } from "../../../shared/validation/objectId.js";
import { LEDGER_PARTY_TYPES, LEDGER_SOURCE_TYPES } from "./ledgerEntry.model.js";

export const listLedgerEntriesQuerySchema = Joi.object({
  partyType: Joi.string().valid(...LEDGER_PARTY_TYPES),
  partyId: objectIdSchema,
  sourceType: Joi.string().valid(...LEDGER_SOURCE_TYPES),
  page: Joi.string().pattern(/^\d+$/),
  limit: Joi.string().pattern(/^\d+$/),
});
