import type { ClientSession } from "mongoose";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import {
  LedgerEntryModel,
  type LedgerEntryAttrs,
  type LedgerPartyType,
} from "./ledgerEntry.model.js";

export async function recordLedgerEntry(
  input: LedgerEntryAttrs,
  session: ClientSession
) {
  const [entry] = await LedgerEntryModel.create([input], { session });
  return entry;
}

interface ListLedgerEntriesOptions {
  partyType?: string | undefined;
  partyId?: string | undefined;
  sourceType?: string | undefined;
  page: number;
  limit: number;
}

export async function listLedgerEntries(options: ListLedgerEntriesOptions) {
  const filter: Record<string, unknown> = {};
  if (options.partyType) filter.partyType = options.partyType;
  if (options.partyId) filter.partyId = options.partyId;
  if (options.sourceType) filter.sourceType = options.sourceType;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    LedgerEntryModel.find(filter).sort({ date: 1, _id: 1 }).skip(skip).limit(options.limit),
    LedgerEntryModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}

export interface StatementLine {
  date: Date;
  sourceType: string;
  sourceId: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

// Customer running balance rises with debit (they owe more); supplier running balance
// rises with credit (we owe more) — mirrors the sign convention used everywhere balances
// are updated (sales invoice=debit, purchase invoice=credit, and their reversals).
export async function getPartyStatement(
  partyType: LedgerPartyType,
  partyId: string
): Promise<StatementLine[]> {
  const entries = await LedgerEntryModel.find({ partyType, partyId }).sort({
    date: 1,
    _id: 1,
  });

  let runningBalance = 0;

  return entries.map((entry) => {
    runningBalance +=
      partyType === "customer" ? entry.debit - entry.credit : entry.credit - entry.debit;

    return {
      date: entry.date,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId.toString(),
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      runningBalance,
    };
  });
}
