import { useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import {
  CollectionsReportView,
  ExpensesReportView,
  PaymentsReportView,
  ProfitReportView,
  PurchasesReportView,
  SalesReportView,
} from "./PeriodReports";
import { TopCustomersReportView, TopRawMaterialsReportView, TopRecipesReportView, TopSuppliersReportView } from "./TopNReports";
import {
  AvailableStockReportView,
  CurrentStockReportView,
  FifoValuationReportView,
  LowStockReportView,
  ReservedStockReportView,
} from "./StockReports";
import ReturnedMixReportView from "./ReturnedMixReportView";

type ReportKey =
  | "sales"
  | "purchases"
  | "expenses"
  | "collections"
  | "payments"
  | "profit"
  | "top-raw-materials"
  | "top-recipes"
  | "top-customers"
  | "top-suppliers"
  | "current-stock"
  | "reserved-stock"
  | "available-stock"
  | "low-stock"
  | "fifo-valuation"
  | "returned-mix";

interface ReportDef {
  key: ReportKey;
  label: string;
  icon: string;
}

const REPORTS: ReportDef[] = [
  { key: "sales", label: "قيمة المبيعات", icon: "bi-graph-up-arrow" },
  { key: "purchases", label: "قيمة المشتريات", icon: "bi-bag-check" },
  { key: "expenses", label: "قيمة المصروفات", icon: "bi-wallet2" },
  { key: "collections", label: "قيمة التحصيلات", icon: "bi-cash-coin" },
  { key: "payments", label: "قيمة المدفوعات", icon: "bi-credit-card" },
  { key: "profit", label: "الأرباح", icon: "bi-piggy-bank" },
  { key: "top-raw-materials", label: "المواد الأكثر مبيعًا", icon: "bi-boxes" },
  { key: "top-recipes", label: "الوصفات الأكثر مبيعًا", icon: "bi-journal-text" },
  { key: "top-customers", label: "العملاء الأكثر شراءً", icon: "bi-people" },
  { key: "top-suppliers", label: "الموردون الأكثر تعاملًا", icon: "bi-truck" },
  { key: "current-stock", label: "المخزون الحالي", icon: "bi-box-seam" },
  { key: "reserved-stock", label: "الكميات المحجوزة", icon: "bi-lock" },
  { key: "available-stock", label: "الكميات المتاحة", icon: "bi-unlock" },
  { key: "low-stock", label: "مواد قاربت على النفاد", icon: "bi-exclamation-triangle" },
  { key: "fifo-valuation", label: "تقييم المخزون (FIFO)", icon: "bi-layers" },
  { key: "returned-mix", label: "مخزون التوليفات المرتجعة", icon: "bi-recycle" },
];

function renderReport(key: ReportKey) {
  switch (key) {
    case "sales":
      return <SalesReportView />;
    case "purchases":
      return <PurchasesReportView />;
    case "expenses":
      return <ExpensesReportView />;
    case "collections":
      return <CollectionsReportView />;
    case "payments":
      return <PaymentsReportView />;
    case "profit":
      return <ProfitReportView />;
    case "top-raw-materials":
      return <TopRawMaterialsReportView />;
    case "top-recipes":
      return <TopRecipesReportView />;
    case "top-customers":
      return <TopCustomersReportView />;
    case "top-suppliers":
      return <TopSuppliersReportView />;
    case "current-stock":
      return <CurrentStockReportView />;
    case "reserved-stock":
      return <ReservedStockReportView />;
    case "available-stock":
      return <AvailableStockReportView />;
    case "low-stock":
      return <LowStockReportView />;
    case "fifo-valuation":
      return <FifoValuationReportView />;
    case "returned-mix":
      return <ReturnedMixReportView />;
    default:
      return null;
  }
}

function ReportsPage() {
  const [active, setActive] = useState<ReportKey>("sales");
  const activeDef = REPORTS.find((r) => r.key === active);

  return (
    <div>
      <PageHeader title="التقارير" description="قائمة ثابتة من التقارير الجاهزة" />

      <Row className="g-3">
        <Col xs={12} lg={3}>
          <Card>
            <Card.Body className="p-2">
              <div className="d-flex flex-column gap-1">
                {REPORTS.map((report) => (
                  <button
                    key={report.key}
                    type="button"
                    className={`btn btn-sm text-start d-flex align-items-center gap-2 ${
                      active === report.key ? "btn-primary" : "btn-light"
                    }`}
                    onClick={() => setActive(report.key)}
                  >
                    <i className={`bi ${report.icon}`} />
                    <span>{report.label}</span>
                  </button>
                ))}
                <hr className="my-2" />
                <Link to="/customers" className="btn btn-sm btn-light text-start d-flex align-items-center gap-2">
                  <i className="bi bi-person-lines-fill" />
                  <span>كشف حساب عميل</span>
                </Link>
                <Link to="/suppliers" className="btn btn-sm btn-light text-start d-flex align-items-center gap-2">
                  <i className="bi bi-person-lines-fill" />
                  <span>كشف حساب مورد</span>
                </Link>
                <Link to="/returns" className="btn btn-sm btn-light text-start d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-return-left" />
                  <span>تقرير المرتجعات</span>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={9}>
          <h6 className="fw-bold mb-3">{activeDef?.label}</h6>
          {renderReport(active)}
        </Col>
      </Row>
    </div>
  );
}

export default ReportsPage;
