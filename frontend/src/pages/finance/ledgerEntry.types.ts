export interface LedgerEntry {
  _id: string;
  partyType: "customer" | "supplier";
  partyId: string;
  date: string;
  sourceType: string;
  sourceId: string;
  description: string;
  debit: number;
  credit: number;
  createdAt: string;
  updatedAt: string;
}
