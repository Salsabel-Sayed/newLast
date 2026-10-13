import { Schema, model, Types } from "mongoose";

export const LEDGER_PARTY_TYPES = ["customer", "supplier"] as const;
export type LedgerPartyType = (typeof LEDGER_PARTY_TYPES)[number];

export const LEDGER_SOURCE_TYPES = [
  "sales_invoice",
  "purchase_invoice",
  "collection",
  "payment",
  "opening_balance",
  "sales_return",
  "purchase_return",
] as const;
export type LedgerSourceType = (typeof LEDGER_SOURCE_TYPES)[number];

export interface LedgerEntryAttrs {
  partyType: LedgerPartyType;
  partyId: Types.ObjectId;
  date: Date;
  sourceType: LedgerSourceType;
  sourceId: Types.ObjectId;
  description: string;
  debit: number;
  credit: number;
}

const ledgerEntrySchema = new Schema<LedgerEntryAttrs>(
  {
    partyType: { type: String, enum: LEDGER_PARTY_TYPES, required: true },
    partyId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    sourceType: { type: String, enum: LEDGER_SOURCE_TYPES, required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ partyType: 1, partyId: 1, date: 1 });
ledgerEntrySchema.index({ sourceType: 1, sourceId: 1 });

export const LedgerEntryModel = model<LedgerEntryAttrs>(
  "LedgerEntry",
  ledgerEntrySchema
);
