import { Fragment, useState } from "react";
import { Button, Card, Table } from "react-bootstrap";
import { apiClient } from "../../api/client";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import type {
  AvailableStockRow,
  CurrentStockRow,
  FifoValuationReport,
  LowStockRow,
  ReservedStockRow,
} from "./reports.types";

function useExpandable() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { expanded, toggle };
}

export function CurrentStockReportView() {
  const { data, loading, error, reload } = useApiResource(() => apiClient.get<CurrentStockRow[]>("/reports/current-stock"), []);
  const { expanded, toggle } = useExpandable();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <Card>
      <Card.Body className="p-0">
        {data.length === 0 ? (
          <EmptyState icon="bi-box-seam" title="لا توجد بيانات" />
        ) : (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th></th>
                <th>المادة الخام</th>
                <th className="text-end">الإجمالي</th>
                <th className="text-end">المحجوز</th>
                <th className="text-end">المتاح</th>
                <th className="text-end">متوسط التكلفة</th>
                <th className="text-end">القيمة</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <Fragment key={row.rawMaterialId}>
                  <tr>
                    <td>
                      <Button variant="link" size="sm" className="p-0" onClick={() => toggle(row.rawMaterialId)}>
                        <i className={`bi ${expanded.has(row.rawMaterialId) ? "bi-chevron-down" : "bi-chevron-start"}`} />
                      </Button>
                    </td>
                    <td className="fw-semibold">
                      {row.name} <span className="text-muted small">({row.code})</span>
                    </td>
                    <td className="text-end">{formatNumber(row.totalQuantity)}</td>
                    <td className="text-end text-muted">{formatNumber(row.reservedQuantity)}</td>
                    <td className={`text-end ${row.availableQuantity <= row.minStockLevel ? "text-danger fw-semibold" : ""}`}>
                      {formatNumber(row.availableQuantity)}
                    </td>
                    <td className="text-end">{formatCurrency(row.averageCostPerKg)}</td>
                    <td className="text-end">{formatCurrency(row.inventoryValue)}</td>
                  </tr>
                  {expanded.has(row.rawMaterialId) && (
                    <tr>
                      <td></td>
                      <td colSpan={6} className="bg-light">
                        {row.batches.length === 0 ? (
                          <span className="text-muted small">لا توجد دفعات نشطة</span>
                        ) : (
                          <Table size="sm" borderless className="mb-0">
                            <thead>
                              <tr className="text-muted small">
                                <th>كود الدفعة</th>
                                <th>تاريخ الشراء</th>
                                <th className="text-end">المتبقي</th>
                                <th className="text-end">المحجوز</th>
                                <th className="text-end">المتاح</th>
                                <th className="text-end">تكلفة الكجم</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.batches.map((batch) => (
                                <tr key={batch.batchId}>
                                  <td>{batch.batchCode}</td>
                                  <td>{formatDate(batch.purchaseDate)}</td>
                                  <td className="text-end">{formatNumber(batch.remainingQty)}</td>
                                  <td className="text-end">{formatNumber(batch.reservedQty)}</td>
                                  <td className="text-end">{formatNumber(batch.availableQty)}</td>
                                  <td className="text-end">{formatCurrency(batch.unitCostPerKg)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

export function ReservedStockReportView() {
  const { data, loading, error, reload } = useApiResource(() => apiClient.get<ReservedStockRow[]>("/reports/reserved-stock"), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <Card>
      <Card.Body className="p-0">
        {data.length === 0 ? (
          <EmptyState icon="bi-lock" title="لا توجد كميات محجوزة حاليًا" />
        ) : (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th className="text-end">إجمالي المحجوز</th>
                <th>الدفعات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.rawMaterialId}>
                  <td className="fw-semibold">
                    {row.name} <span className="text-muted small">({row.code})</span>
                  </td>
                  <td className="text-end">{formatNumber(row.reservedQuantity)}</td>
                  <td className="text-muted small">
                    {row.batches.map((b) => `${b.batchCode} (${formatNumber(b.reservedQty)})`).join("، ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

export function AvailableStockReportView() {
  const { data, loading, error, reload } = useApiResource(() => apiClient.get<AvailableStockRow[]>("/reports/available-stock"), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <Card>
      <Card.Body className="p-0">
        {data.length === 0 ? (
          <EmptyState icon="bi-box" title="لا توجد بيانات" />
        ) : (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th className="text-end">الكمية المتاحة</th>
                <th>الدفعات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.rawMaterialId}>
                  <td className="fw-semibold">
                    {row.name} <span className="text-muted small">({row.code})</span>
                  </td>
                  <td className="text-end">{formatNumber(row.availableQuantity)}</td>
                  <td className="text-muted small">
                    {row.batches.map((b) => `${b.batchCode} (${formatNumber(b.availableQty)})`).join("، ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

export function LowStockReportView() {
  const { data, loading, error, reload } = useApiResource(() => apiClient.get<LowStockRow[]>("/reports/low-stock"), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <Card>
      <Card.Body className="p-0">
        {data.length === 0 ? (
          <EmptyState icon="bi-check-circle" title="لا توجد مواد قاربت على النفاد" />
        ) : (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th className="text-end">المتاح</th>
                <th className="text-end">حد الطلب الأدنى</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id}>
                  <td className="fw-semibold">
                    {row.name} <span className="text-muted small">({row.code})</span>
                  </td>
                  <td className="text-end text-danger fw-semibold">{formatNumber(row.availableQuantity)}</td>
                  <td className="text-end text-muted">{formatNumber(row.minStockLevel)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

export function FifoValuationReportView() {
  const { data, loading, error, reload } = useApiResource(() => apiClient.get<FifoValuationReport>("/reports/fifo-valuation"), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <Card className="mb-3">
        <Card.Body className="text-center">
          <div className="text-muted small mb-1">إجمالي قيمة المخزون (FIFO)</div>
          <div className="fs-4 fw-bold">{formatCurrency(data.totalValue)}</div>
        </Card.Body>
      </Card>
      <Card>
        <Card.Body className="p-0">
          {data.items.length === 0 ? (
            <EmptyState icon="bi-layers" title="لا توجد دفعات نشطة" />
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>كود الدفعة</th>
                  <th>المادة الخام</th>
                  <th>تاريخ الشراء</th>
                  <th className="text-end">المتبقي</th>
                  <th className="text-end">تكلفة الكجم</th>
                  <th className="text-end">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.batchId}>
                    <td className="text-muted">{item.batchCode}</td>
                    <td className="fw-semibold">{item.rawMaterialName}</td>
                    <td>{formatDate(item.purchaseDate)}</td>
                    <td className="text-end">{formatNumber(item.remainingQty)}</td>
                    <td className="text-end">{formatCurrency(item.unitCostPerKg)}</td>
                    <td className="text-end">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
