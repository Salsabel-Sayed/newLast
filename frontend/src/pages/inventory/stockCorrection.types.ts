export interface StockCorrection {
  _id: string;
  correctionNumber: string;
  batchId: string;
  batchCode: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  quantityBeforeKg: number;
  quantityAfterKg: number;
  differenceKg: number;
  reason: string;
  correctionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
