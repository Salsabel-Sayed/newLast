export const LEDGER_SOURCE_TYPE_LABELS: Record<string, string> = {
  sales_invoice: "فاتورة بيع",
  purchase_invoice: "فاتورة شراء",
  collection: "تحصيل",
  payment: "دفعة لمورد",
  opening_balance: "رصيد افتتاحي",
  sales_return: "مرتجع بيع",
  purchase_return: "مرتجع شراء",
};

export function ledgerSourceTypeLabel(sourceType: string): string {
  return LEDGER_SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
}
