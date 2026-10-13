export interface LowStockAlertItem {
  _id: string;
  code: string;
  name: string;
  minStockLevel: number;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  averageCostPerKg: number;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  inventory: { totalValue: number; rawMaterialCount: number };
  sales: { total: number };
  purchases: { total: number };
  profit: { total: number; revenue: number; cost: number; expenses: number };
  collections: { total: number };
  payments: { total: number };
  alerts: { lowStockCount: number; lowStockItems: LowStockAlertItem[] };
}
