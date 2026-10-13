export interface Party {
  _id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
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

export interface PartyConfig {
  apiBasePath: string;
  routeBasePath: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  balanceLabel: string;
  debitLabel: string;
  creditLabel: string;
}
