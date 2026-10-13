export interface RawMaterial {
  _id: string;
  code: string;
  name: string;
  categoryId?: string;
  minStockLevel: number;
  supplierIds: string[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  averageCostPerKg: number;
}

export interface RawMaterialFormValues {
  code: string;
  name: string;
  categoryId: string;
  minStockLevel: string;
  supplierIds: string[];
  isActive: boolean;
  notes: string;
}
