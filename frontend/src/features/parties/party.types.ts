export interface Party {
  _id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  openingBalanceAmount?: number;
  openingBalanceSide?: "they_owe_us" | "we_owe_them";
  openingBalanceDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyFormValues {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  openingBalanceAmount: string;
  openingBalanceDate: string;
  openingBalanceSide: "they_owe_us" | "we_owe_them";
  isActive: boolean;
  notes: string;
}

export interface StatementLine {
  date: string;
  sourceType: string;
  sourceId: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface PartyBalanceSummary {
  positiveBalanceTotal: number;
  negativeBalanceTotal: number;
  netBalance: number;
}

export interface PartyConfig {
  partyType: "customer" | "supplier";
  apiBasePath: string;
  routeBasePath: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  balanceLabel: string;
  positiveBalanceSummaryLabel: string;
  negativeBalanceSummaryLabel: string;
  netBalanceSummaryLabel: string;
  debitLabel: string;
  creditLabel: string;
}
