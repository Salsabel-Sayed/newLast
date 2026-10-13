export interface NavLeaf {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  icon: string;
  items: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export const NAVIGATION: NavEntry[] = [
  { label: "لوحة التحكم", path: "/", icon: "bi-speedometer2" },
  { label: "العملاء", path: "/customers", icon: "bi-people" },
  { label: "الموردون", path: "/suppliers", icon: "bi-truck" },
  {
    label: "المخزون",
    icon: "bi-box-seam",
    items: [
      { label: "المواد الخام", path: "/inventory/raw-materials", icon: "bi-boxes" },
      { label: "فئات المواد الخام", path: "/inventory/raw-material-categories", icon: "bi-tags" },
      { label: "الدفعات", path: "/inventory/batches", icon: "bi-layers" },
      { label: "حركات المخزون", path: "/inventory/stock-movements", icon: "bi-arrow-left-right" },
      { label: "الرصيد الافتتاحي", path: "/inventory/opening-balances", icon: "bi-clipboard-data" },
      { label: "تصحيح المخزون", path: "/inventory/stock-corrections", icon: "bi-tools" },
    ],
  },
  {
    label: "الوصفات",
    icon: "bi-journal-richtext",
    items: [
      { label: "الوصفات", path: "/recipes", icon: "bi-journal-text" },
      { label: "فئات الوصفات", path: "/recipes/categories", icon: "bi-bookmarks" },
    ],
  },
  {
    label: "المشتريات",
    icon: "bi-cart-plus",
    items: [
      { label: "أوامر الشراء", path: "/purchases/orders", icon: "bi-cart" },
      { label: "فواتير الشراء", path: "/purchases/invoices", icon: "bi-receipt" },
    ],
  },
  {
    label: "المبيعات",
    icon: "bi-cart-check",
    items: [
      { label: "أوامر البيع", path: "/sales/orders", icon: "bi-cart-check" },
      { label: "فواتير البيع", path: "/sales/invoices", icon: "bi-receipt-cutoff" },
    ],
  },
  {
    label: "المرتجعات",
    icon: "bi-arrow-return-left",
    items: [
      { label: "المرتجعات", path: "/returns", icon: "bi-arrow-return-left" },
      { label: "منطقة التوليفات المرتجعة", path: "/returns/returned-mixes", icon: "bi-recycle" },
    ],
  },
  {
    label: "المالية",
    icon: "bi-cash-stack",
    items: [
      { label: "التحصيلات", path: "/finance/collections", icon: "bi-cash-coin" },
      { label: "مدفوعات الموردين", path: "/finance/supplier-payments", icon: "bi-credit-card" },
      { label: "المصروفات", path: "/finance/expenses", icon: "bi-wallet2" },
      { label: "دفتر الأستاذ", path: "/finance/ledger", icon: "bi-journal-bookmark" },
    ],
  },
  { label: "التقارير", path: "/reports", icon: "bi-bar-chart-line" },
  { label: "الإعدادات", path: "/settings", icon: "bi-gear" },
];
