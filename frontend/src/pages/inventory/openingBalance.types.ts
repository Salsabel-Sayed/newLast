import type { PackageType } from "../../features/inventory/packageTypes";

export interface OpeningBalanceItem {
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  supplierId?: string;
  supplierName?: string;
  packageType: PackageType;
  customPackageName?: string;
  packageCount: number;
  kgPerPackage: number;
  totalKg: number;
  totalCost: number;
  unitCostPerKg: number;
  productionDate?: string;
  batchId?: string;
}

export interface OpeningBalance {
  _id: string;
  openingNumber: string;
  openingDate: string;
  items: OpeningBalanceItem[];
  status: "draft" | "posted";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningBalanceItemFormRow {
  key: string;
  rawMaterialId: string;
  supplierId: string;
  packageType: PackageType;
  customPackageName: string;
  packageCount: string;
  kgPerPackage: string;
  totalCost: string;
  productionDate: string;
}
