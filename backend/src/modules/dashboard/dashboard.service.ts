import {
  getCollectionsReport,
  getCurrentStockReport,
  getLowStockReport,
  getPaymentsReport,
  getProfitReport,
  getPurchasesReport,
  getSalesReport,
} from "../reports/reports.service.js";

export async function getDashboardSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const period = { dateFrom: monthStart.toISOString(), dateTo: now.toISOString() };

  const [stock, sales, purchases, profit, collections, payments, lowStock] = await Promise.all([
    getCurrentStockReport(),
    getSalesReport(period),
    getPurchasesReport(period),
    getProfitReport(period),
    getCollectionsReport(period),
    getPaymentsReport(period),
    getLowStockReport(),
  ]);

  return {
    period: { from: period.dateFrom, to: period.dateTo },
    inventory: {
      totalValue: stock.reduce((sum, entry) => sum + entry.inventoryValue, 0),
      rawMaterialCount: stock.length,
    },
    sales: { total: sales.total },
    purchases: { total: purchases.total },
    profit: { total: profit.profit, revenue: profit.revenue, cost: profit.cost, expenses: profit.expenses },
    collections: { total: collections.total },
    payments: { total: payments.total },
    alerts: {
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
    },
  };
}
