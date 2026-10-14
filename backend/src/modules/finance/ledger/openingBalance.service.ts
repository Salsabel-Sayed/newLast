import type { ClientSession, Types } from "mongoose";
import { LedgerEntryModel, type LedgerPartyType } from "./ledgerEntry.model.js";

export type OpeningBalanceSide = "they_owe_us" | "we_owe_them";

export interface OpeningBalanceDetails {
  openingBalanceAmount: number;
  openingBalanceSide: OpeningBalanceSide;
  openingBalanceDate?: Date;
}

interface PartyWithOpeningBalance {
  _id: Types.ObjectId;
  openingBalanceAmount?: number;
  openingBalanceSide?: OpeningBalanceSide;
  openingBalanceDate?: Date;
  toObject?: () => unknown;
}

interface LegacyOpeningBalance {
  signedAmount: number;
  date?: Date;
}

export function signedOpeningBalanceAmount(
  partyType: LedgerPartyType,
  amount: number,
  side: OpeningBalanceSide
): number {
  if (partyType === "customer") {
    return side === "they_owe_us" ? amount : -amount;
  }
  return side === "we_owe_them" ? amount : -amount;
}

function sideFromSignedAmount(
  partyType: LedgerPartyType,
  signedAmount: number
): OpeningBalanceSide {
  if (signedAmount === 0) return "they_owe_us";
  if (partyType === "customer") {
    return signedAmount > 0 ? "they_owe_us" : "we_owe_them";
  }
  return signedAmount > 0 ? "we_owe_them" : "they_owe_us";
}

function signedLedgerAmount(
  partyType: LedgerPartyType,
  debit: number,
  credit: number
): number {
  return partyType === "customer" ? debit - credit : credit - debit;
}

export async function attachOpeningBalanceDetails<T extends PartyWithOpeningBalance>(
  partyType: LedgerPartyType,
  parties: T[],
  session?: ClientSession
): Promise<Array<Record<string, unknown> & OpeningBalanceDetails>> {
  const legacyParties = parties.filter(
    (party) =>
      typeof party.openingBalanceAmount !== "number" || !party.openingBalanceSide
  );
  const legacyIds = legacyParties.map((party) => party._id);
  const legacyBalances = new Map<string, LegacyOpeningBalance>();

  for (const party of legacyParties) {
    legacyBalances.set(party._id.toString(), { signedAmount: 0 });
  }

  if (legacyIds.length > 0) {
    const query = LedgerEntryModel.find({
      partyType,
      partyId: { $in: legacyIds },
      sourceType: { $in: ["opening_balance", "opening_balance_adjustment"] },
    }).sort({ date: 1, _id: 1 });
    if (session) query.session(session);
    const entries = await query;

    for (const entry of entries) {
      const key = entry.partyId.toString();
      const details = legacyBalances.get(key);
      if (!details) continue;

      details.signedAmount += signedLedgerAmount(partyType, entry.debit, entry.credit);
      if (entry.sourceType === "opening_balance" && !details.date) {
        details.date = entry.date;
      } else if (!details.date && entry.sourceType === "opening_balance_adjustment") {
        details.date = entry.date;
      }
    }
  }

  return parties.map((party) => {
    const hasStoredBalance =
      typeof party.openingBalanceAmount === "number" && !!party.openingBalanceSide;
    const legacy = legacyBalances.get(party._id.toString());
    const signedAmount = legacy?.signedAmount ?? 0;
    const plain = party.toObject ? party.toObject() : party;
    const storedAmount = hasStoredBalance ? party.openingBalanceAmount! : Math.abs(signedAmount);
    const storedSide = hasStoredBalance
      ? party.openingBalanceSide!
      : sideFromSignedAmount(partyType, signedAmount);
    const storedDate = party.openingBalanceDate ?? legacy?.date;

    return {
      ...(plain as Record<string, unknown>),
      openingBalanceAmount: storedAmount,
      openingBalanceSide: storedSide,
      ...(storedDate ? { openingBalanceDate: storedDate } : {}),
    };
  });
}

export async function getOpeningBalanceDetails(
  partyType: LedgerPartyType,
  party: PartyWithOpeningBalance,
  session?: ClientSession
): Promise<OpeningBalanceDetails> {
  const [details] = await attachOpeningBalanceDetails(partyType, [party], session);
  return {
    openingBalanceAmount: details?.openingBalanceAmount ?? 0,
    openingBalanceSide: details?.openingBalanceSide ?? "they_owe_us",
    ...(details?.openingBalanceDate instanceof Date
      ? { openingBalanceDate: details.openingBalanceDate }
      : {}),
  };
}
