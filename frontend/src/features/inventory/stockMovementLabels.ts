export const STOCK_MOVEMENT_TYPE_LABELS: Record<string, string> = {
  opening_balance: "رصيد افتتاحي",
  purchase_receipt: "استلام مشتريات",
  sales_reservation: "حجز للبيع",
  sales_reservation_release: "إلغاء حجز",
  sales_issue: "صرف بيع",
  sales_return: "مرتجع بيع",
  returned_mix_in: "إضافة توليفة مرتجعة",
  returned_mix_out: "صرف توليفة مرتجعة",
  purchase_return: "مرتجع شراء",
  stock_correction_increase: "تصحيح مخزون (زيادة)",
  stock_correction_decrease: "تصحيح مخزون (نقص)",
};

export const STOCK_MOVEMENT_DIRECTION_LABELS: Record<string, string> = {
  in: "إدخال",
  out: "إخراج",
  reserve: "حجز",
  release: "تحرير حجز",
};

export const RELATED_ENTITY_TYPE_LABELS: Record<string, string> = {
  PurchaseOrder: "أمر شراء",
  OpeningBalance: "رصيد افتتاحي",
  Return: "مرتجع",
  SalesOrder: "أمر بيع",
  StockCorrection: "تصحيح مخزون",
  ReturnedMixBatch: "توليفة مرتجعة",
};

export const BATCH_STATUS_LABELS: Record<string, { label: string; variant: "success" | "secondary" | "warning" }> = {
  active: { label: "نشطة", variant: "success" },
  depleted: { label: "منتهية", variant: "secondary" },
  locked: { label: "مقيَّدة للتصنيع فقط", variant: "warning" },
};

export function stockMovementTypeLabel(type: string): string {
  return STOCK_MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function stockMovementDirectionLabel(direction: string): string {
  return STOCK_MOVEMENT_DIRECTION_LABELS[direction] ?? direction;
}

export function relatedEntityTypeLabel(type: string): string {
  return RELATED_ENTITY_TYPE_LABELS[type] ?? type;
}
