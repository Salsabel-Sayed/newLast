export interface StockMovement {
  _id: string;
  rawMaterialId?: string;
  batchId?: string;
  returnedMixBatchId?: string;
  quantityKg: number;
  direction: "in" | "out" | "reserve" | "release";
  movementType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
