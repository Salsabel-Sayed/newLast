import { Card, Col, Row, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { DashboardSummary } from "./dashboard.types";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  tone: "primary" | "success" | "info" | "warning" | "danger" | "secondary";
}

function SummaryCard({ title, value, icon, tone }: SummaryCardProps) {
  return (
    <Col xs={12} sm={6} xl={4}>
      <Card className="h-100">
        <Card.Body className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 52,
              height: 52,
              backgroundColor: `rgba(var(--bs-${tone}-rgb), 0.12)`,
              color: `var(--bs-${tone})`,
              fontSize: "1.4rem",
            }}
          >
            <i className={`bi ${icon}`} />
          </div>
          <div>
            <div className="text-muted small mb-1">{title}</div>
            <div className="fs-5 fw-bold">{value}</div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function DashboardPage() {
  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<DashboardSummary>("/dashboard/summary"),
    []
  );

  return (
    <div>
      <PageHeader title="لوحة التحكم" description="ملخص حالة النظام لهذا الشهر" />

      {loading && <LoadingState label="جارٍ تحميل الملخص..." />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && data && (
        <>
          <Row className="g-3 mb-4">
            <SummaryCard
              title="إجمالي المبيعات"
              value={formatCurrency(data.sales.total)}
              icon="bi-graph-up-arrow"
              tone="primary"
            />
            <SummaryCard
              title="إجمالي المشتريات"
              value={formatCurrency(data.purchases.total)}
              icon="bi-bag-check"
              tone="info"
            />
            <SummaryCard
              title="صافي الربح"
              value={formatCurrency(data.profit.total)}
              icon="bi-cash-coin"
              tone="success"
            />
            <SummaryCard
              title="التحصيلات"
              value={formatCurrency(data.collections.total)}
              icon="bi-wallet2"
              tone="secondary"
            />
            <SummaryCard
              title="المدفوعات للموردين"
              value={formatCurrency(data.payments.total)}
              icon="bi-credit-card"
              tone="warning"
            />
            <SummaryCard
              title="قيمة المخزون الحالي"
              value={formatCurrency(data.inventory.totalValue)}
              icon="bi-box-seam"
              tone="primary"
            />
          </Row>

          <Row className="g-3">
            <Col xs={12} lg={7}>
              <Card>
                <Card.Header className="bg-white fw-semibold">تفاصيل الربحية هذا الشهر</Card.Header>
                <Card.Body>
                  <Table borderless size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted">الإيرادات</td>
                        <td className="text-end fw-semibold">{formatCurrency(data.profit.revenue)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">تكلفة البضاعة المباعة</td>
                        <td className="text-end fw-semibold">{formatCurrency(data.profit.cost)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">المصروفات التشغيلية</td>
                        <td className="text-end fw-semibold">{formatCurrency(data.profit.expenses)}</td>
                      </tr>
                      <tr className="border-top">
                        <td className="fw-bold pt-2">صافي الربح</td>
                        <td className="text-end fw-bold pt-2 text-success">
                          {formatCurrency(data.profit.total)}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={5}>
              <Card className="h-100">
                <Card.Header className="bg-white fw-semibold d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-exclamation-triangle-fill text-warning me-2" />
                    تنبيهات نقص المخزون
                  </span>
                  {data.alerts.lowStockCount > 0 && (
                    <span className="badge text-bg-warning">{data.alerts.lowStockCount}</span>
                  )}
                </Card.Header>
                <Card.Body className="p-0">
                  {data.alerts.lowStockItems.length === 0 ? (
                    <div className="p-4">
                      <EmptyState icon="bi-check-circle" title="لا توجد تنبيهات حاليًا" />
                    </div>
                  ) : (
                    <Table responsive hover className="mb-0">
                      <thead>
                        <tr>
                          <th>الصنف</th>
                          <th className="text-end">المتاح</th>
                          <th className="text-end">حد الطلب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.alerts.lowStockItems.map((item) => (
                          <tr key={item._id}>
                            <td>
                              <Link to="/inventory/raw-materials" className="text-decoration-none">
                                {item.name}
                              </Link>
                              <div className="text-muted small">{item.code}</div>
                            </td>
                            <td className="text-end text-danger fw-semibold">
                              {formatNumber(item.availableQuantity)}
                            </td>
                            <td className="text-end text-muted">{formatNumber(item.minStockLevel)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
