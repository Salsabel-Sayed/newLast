export interface ReturnedMixBatch {
  _id: string;
  recipeId: string;
  recipeName: string;
  originalQty: number;
  remainingQty: number;
  reservedQty: number;
  unitCostPerKg: number;
  sourceReturnId: string;
  returnDate: string;
  status: "active" | "depleted" | "disposed";
  createdAt: string;
  updatedAt: string;
}

export const RETURNED_MIX_STATUS_LABELS: Record<
  ReturnedMixBatch["status"],
  { label: string; variant: "success" | "secondary" | "danger" }
> = {
  active: { label: "نشطة", variant: "success" },
  depleted: { label: "منتهية", variant: "secondary" },
  disposed: { label: "تم إتلافها", variant: "danger" },
};
