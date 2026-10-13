import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ComingSoon from "./components/common/ComingSoon";
import { ToastProvider } from "./components/common/ToastProvider";
import { ConfirmProvider } from "./components/common/ConfirmProvider";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import SupplierDetailPage from "./pages/suppliers/SupplierDetailPage";
import RawMaterialCategoriesPage from "./pages/inventory/RawMaterialCategoriesPage";
import RecipeCategoriesPage from "./pages/recipes/RecipeCategoriesPage";
import RawMaterialsPage from "./pages/inventory/RawMaterialsPage";
import BatchesPage from "./pages/inventory/BatchesPage";
import StockMovementsPage from "./pages/inventory/StockMovementsPage";
import OpeningBalancesPage from "./pages/inventory/OpeningBalancesPage";
import NewOpeningBalancePage from "./pages/inventory/NewOpeningBalancePage";
import OpeningBalanceDetailPage from "./pages/inventory/OpeningBalanceDetailPage";
import StockCorrectionsPage from "./pages/inventory/StockCorrectionsPage";
import RecipesPage from "./pages/recipes/RecipesPage";
import RecipeFormPage from "./pages/recipes/RecipeFormPage";
import RecipeDetailPage from "./pages/recipes/RecipeDetailPage";
import PurchaseOrdersPage from "./pages/purchases/PurchaseOrdersPage";
import PurchaseOrderFormPage from "./pages/purchases/PurchaseOrderFormPage";
import PurchaseOrderDetailPage from "./pages/purchases/PurchaseOrderDetailPage";
import PurchaseInvoicesPage from "./pages/purchases/PurchaseInvoicesPage";
import PurchaseInvoiceDetailPage from "./pages/purchases/PurchaseInvoiceDetailPage";
import SalesOrdersPage from "./pages/sales/SalesOrdersPage";
import SalesOrderFormPage from "./pages/sales/SalesOrderFormPage";
import SalesOrderDetailPage from "./pages/sales/SalesOrderDetailPage";
import SalesInvoicesPage from "./pages/sales/SalesInvoicesPage";
import SalesInvoiceDetailPage from "./pages/sales/SalesInvoiceDetailPage";
import ReturnsPage from "./pages/returns/ReturnsPage";
import NewReturnPage from "./pages/returns/NewReturnPage";
import ReturnDetailPage from "./pages/returns/ReturnDetailPage";
import ReturnedMixAreaPage from "./pages/returns/ReturnedMixAreaPage";
import CollectionsPage from "./pages/finance/CollectionsPage";
import SupplierPaymentsPage from "./pages/finance/SupplierPaymentsPage";
import ExpensesPage from "./pages/finance/ExpensesPage";
import LedgerPage from "./pages/finance/LedgerPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />

              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="suppliers/:id" element={<SupplierDetailPage />} />

              <Route path="inventory/raw-materials" element={<RawMaterialsPage />} />
              <Route path="inventory/raw-material-categories" element={<RawMaterialCategoriesPage />} />
              <Route path="inventory/batches" element={<BatchesPage />} />
              <Route path="inventory/stock-movements" element={<StockMovementsPage />} />
              <Route path="inventory/opening-balances" element={<OpeningBalancesPage />} />
              <Route path="inventory/opening-balances/new" element={<NewOpeningBalancePage />} />
              <Route path="inventory/opening-balances/:id" element={<OpeningBalanceDetailPage />} />
              <Route path="inventory/stock-corrections" element={<StockCorrectionsPage />} />

              <Route path="recipes" element={<RecipesPage />} />
              <Route path="recipes/categories" element={<RecipeCategoriesPage />} />
              <Route path="recipes/new" element={<RecipeFormPage />} />
              <Route path="recipes/:id" element={<RecipeDetailPage />} />
              <Route path="recipes/:id/edit" element={<RecipeFormPage />} />

              <Route path="purchases/orders" element={<PurchaseOrdersPage />} />
              <Route path="purchases/orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="purchases/orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="purchases/orders/:id/edit" element={<PurchaseOrderFormPage />} />
              <Route path="purchases/invoices" element={<PurchaseInvoicesPage />} />
              <Route path="purchases/invoices/:id" element={<PurchaseInvoiceDetailPage />} />

              <Route path="sales/orders" element={<SalesOrdersPage />} />
              <Route path="sales/orders/new" element={<SalesOrderFormPage />} />
              <Route path="sales/orders/:id" element={<SalesOrderDetailPage />} />
              <Route path="sales/orders/:id/edit" element={<SalesOrderFormPage />} />
              <Route path="sales/invoices" element={<SalesInvoicesPage />} />
              <Route path="sales/invoices/:id" element={<SalesInvoiceDetailPage />} />

              <Route path="returns" element={<ReturnsPage />} />
              <Route path="returns/new" element={<NewReturnPage />} />
              <Route path="returns/returned-mixes" element={<ReturnedMixAreaPage />} />
              <Route path="returns/:id" element={<ReturnDetailPage />} />

              <Route path="finance/collections" element={<CollectionsPage />} />
              <Route path="finance/supplier-payments" element={<SupplierPaymentsPage />} />
              <Route path="finance/expenses" element={<ExpensesPage />} />
              <Route path="finance/ledger" element={<LedgerPage />} />

              <Route path="reports" element={<ReportsPage />} />

              <Route path="settings" element={<SettingsPage />} />

              <Route path="*" element={<ComingSoon title="الصفحة غير موجودة" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
