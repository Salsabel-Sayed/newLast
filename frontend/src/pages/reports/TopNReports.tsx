import { useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { apiClient } from "../../api/client";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatNumber } from "../../utils/format";
import DateRangeFilter from "./DateRangeFilter";
import type { TopCustomerRow, TopRawMaterialRow, TopRecipeRow, TopSupplierRow } from "./reports.types";

const DEFAULT_LIMIT = 10;

function useDateRange() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(String(DEFAULT_LIMIT));
  return { dateFrom, setDateFrom, dateTo, setDateTo, limit, setLimit };
}

function LimitFilter({ limit, onChange }: { limit: string; onChange: (value: string) => void }) {
  return (
    <Form.Group style={{ maxWidth: 110 }}>
      <Form.Label className="small text-muted mb-1">عدد النتائج</Form.Label>
      <Form.Control type="number" dir="ltr" lang="en-US" size="sm" min={1} max={100} value={limit} onChange={(e) => onChange(e.target.value)} />
    </Form.Group>
  );
}

export function TopRawMaterialsReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo, limit, setLimit } = useDateRange();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<TopRawMaterialRow[]>("/reports/top-raw-materials", {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: Number(limit) || DEFAULT_LIMIT,
      }),
    [dateFrom, dateTo, limit]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <LimitFilter limit={limit} onChange={setLimit} />
      </div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <Card>
          <Card.Body className="p-0">
            {data.length === 0 ? (
              <EmptyState icon="bi-boxes" title="لا توجد بيانات" />
            ) : (
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المادة الخام</th>
                    <th className="text-end">الكمية المباعة (كجم)</th>
                    <th className="text-end">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.rawMaterialId}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{row.name}</td>
                      <td className="text-end">{formatNumber(row.qty)}</td>
                      <td className="text-end">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export function TopRecipesReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo, limit, setLimit } = useDateRange();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<TopRecipeRow[]>("/reports/top-recipes", {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: Number(limit) || DEFAULT_LIMIT,
      }),
    [dateFrom, dateTo, limit]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <LimitFilter limit={limit} onChange={setLimit} />
      </div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <Card>
          <Card.Body className="p-0">
            {data.length === 0 ? (
              <EmptyState icon="bi-journal-text" title="لا توجد بيانات" />
            ) : (
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>التوليفة</th>
                    <th className="text-end">الكمية المباعة (كجم)</th>
                    <th className="text-end">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.recipeId}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{row.name}</td>
                      <td className="text-end">{formatNumber(row.qty)}</td>
                      <td className="text-end">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export function TopCustomersReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo, limit, setLimit } = useDateRange();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<TopCustomerRow[]>("/reports/top-customers", {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: Number(limit) || DEFAULT_LIMIT,
      }),
    [dateFrom, dateTo, limit]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <LimitFilter limit={limit} onChange={setLimit} />
      </div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <Card>
          <Card.Body className="p-0">
            {data.length === 0 ? (
              <EmptyState icon="bi-people" title="لا توجد بيانات" />
            ) : (
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>العميل</th>
                    <th className="text-end">عدد الفواتير</th>
                    <th className="text-end">إجمالي المشتريات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.customerId}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{row.name}</td>
                      <td className="text-end">{formatNumber(row.invoiceCount)}</td>
                      <td className="text-end">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export function TopSuppliersReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo, limit, setLimit } = useDateRange();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<TopSupplierRow[]>("/reports/top-suppliers", {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: Number(limit) || DEFAULT_LIMIT,
      }),
    [dateFrom, dateTo, limit]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <LimitFilter limit={limit} onChange={setLimit} />
      </div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <Card>
          <Card.Body className="p-0">
            {data.length === 0 ? (
              <EmptyState icon="bi-truck" title="لا توجد بيانات" />
            ) : (
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المورد</th>
                    <th className="text-end">عدد الفواتير</th>
                    <th className="text-end">إجمالي التعامل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.supplierId}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{row.name}</td>
                      <td className="text-end">{formatNumber(row.invoiceCount)}</td>
                      <td className="text-end">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
