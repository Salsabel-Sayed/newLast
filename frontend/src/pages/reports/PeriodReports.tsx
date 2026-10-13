import { useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { apiClient } from "../../api/client";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import DateRangeFilter from "./DateRangeFilter";
import type {
  CollectionsReport,
  ExpensesReport,
  PaymentsReport,
  ProfitReport,
  PurchasesReport,
  SalesReport,
} from "./reports.types";

function useDateRange() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  return { dateFrom, setDateFrom, dateTo, setDateTo };
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center px-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fs-4 fw-bold">{value}</div>
    </div>
  );
}

export function SalesReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();
  const [customerId, setCustomerId] = useState("");
  const { items: customers } = useLookupList<Party>("/customers", true);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<SalesReport>("/reports/sales", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, customerId: customerId || undefined }),
    [dateFrom, dateTo, customerId]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <Form.Group style={{ maxWidth: 220 }}>
          <Form.Label className="small text-muted mb-1">العميل</Form.Label>
          <Form.Select size="sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">الكل</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex justify-content-center">
              <SummaryStat label="إجمالي المبيعات" value={formatCurrency(data.total)} />
            </Card.Body>
          </Card>

          <div className="row g-3">
            <div className="col-md-6">
              <Card>
                <Card.Header className="bg-white fw-semibold">حسب العميل</Card.Header>
                <Card.Body className="p-0">
                  {data.byCustomer.length === 0 ? (
                    <EmptyState icon="bi-people" title="لا توجد بيانات" />
                  ) : (
                    <Table responsive size="sm" className="mb-0">
                      <tbody>
                        {data.byCustomer.map((row) => (
                          <tr key={row.customerId}>
                            <td>{row.name}</td>
                            <td className="text-end">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-6">
              <Card>
                <Card.Header className="bg-white fw-semibold">حسب الصنف</Card.Header>
                <Card.Body className="p-0">
                  {data.byItem.length === 0 ? (
                    <EmptyState icon="bi-box" title="لا توجد بيانات" />
                  ) : (
                    <Table responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>الصنف</th>
                          <th className="text-end">الكمية</th>
                          <th className="text-end">القيمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byItem.map((row) => (
                          <tr key={row.itemId}>
                            <td>{row.name}</td>
                            <td className="text-end">{formatNumber(row.qty)}</td>
                            <td className="text-end">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PurchasesReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();
  const [supplierId, setSupplierId] = useState("");
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<PurchasesReport>("/reports/purchases", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, supplierId: supplierId || undefined }),
    [dateFrom, dateTo, supplierId]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <Form.Group style={{ maxWidth: 220 }}>
          <Form.Label className="small text-muted mb-1">المورد</Form.Label>
          <Form.Select size="sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">الكل</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex justify-content-center">
              <SummaryStat label="إجمالي المشتريات" value={formatCurrency(data.total)} />
            </Card.Body>
          </Card>

          <div className="row g-3">
            <div className="col-md-6">
              <Card>
                <Card.Header className="bg-white fw-semibold">حسب المورد</Card.Header>
                <Card.Body className="p-0">
                  {data.bySupplier.length === 0 ? (
                    <EmptyState icon="bi-truck" title="لا توجد بيانات" />
                  ) : (
                    <Table responsive size="sm" className="mb-0">
                      <tbody>
                        {data.bySupplier.map((row) => (
                          <tr key={row.supplierId}>
                            <td>{row.name}</td>
                            <td className="text-end">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-6">
              <Card>
                <Card.Header className="bg-white fw-semibold">حسب الصنف</Card.Header>
                <Card.Body className="p-0">
                  {data.byItem.length === 0 ? (
                    <EmptyState icon="bi-box" title="لا توجد بيانات" />
                  ) : (
                    <Table responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>الصنف</th>
                          <th className="text-end">الكمية</th>
                          <th className="text-end">القيمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byItem.map((row) => (
                          <tr key={row.itemId}>
                            <td>{row.name}</td>
                            <td className="text-end">{row.qty.toFixed(2)}</td>
                            <td className="text-end">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ExpensesReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();
  const [category, setCategory] = useState("");

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<ExpensesReport>("/reports/expenses", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, category: category || undefined }),
    [dateFrom, dateTo, category]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <Form.Group style={{ maxWidth: 200 }}>
          <Form.Label className="small text-muted mb-1">الفئة</Form.Label>
          <Form.Control size="sm" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="اسم الفئة..." />
        </Form.Group>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex justify-content-center">
              <SummaryStat label="إجمالي المصروفات" value={formatCurrency(data.total)} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className="bg-white fw-semibold">حسب الفئة</Card.Header>
            <Card.Body className="p-0">
              {data.byCategory.length === 0 ? (
                <EmptyState icon="bi-wallet2" title="لا توجد بيانات" />
              ) : (
                <Table responsive size="sm" className="mb-0">
                  <tbody>
                    {data.byCategory.map((row) => (
                      <tr key={row.category}>
                        <td>{row.category}</td>
                        <td className="text-end">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

export function CollectionsReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();
  const [customerId, setCustomerId] = useState("");
  const { items: customers } = useLookupList<Party>("/customers", true);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<CollectionsReport>("/reports/collections", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, customerId: customerId || undefined }),
    [dateFrom, dateTo, customerId]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <Form.Group style={{ maxWidth: 220 }}>
          <Form.Label className="small text-muted mb-1">العميل</Form.Label>
          <Form.Select size="sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">الكل</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex justify-content-center">
              <SummaryStat label="إجمالي التحصيلات" value={formatCurrency(data.total)} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className="bg-white fw-semibold">حسب العميل</Card.Header>
            <Card.Body className="p-0">
              {data.byCustomer.length === 0 ? (
                <EmptyState icon="bi-people" title="لا توجد بيانات" />
              ) : (
                <Table responsive size="sm" className="mb-0">
                  <tbody>
                    {data.byCustomer.map((row) => (
                      <tr key={row.customerId}>
                        <td>{row.name}</td>
                        <td className="text-end">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

export function PaymentsReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();
  const [supplierId, setSupplierId] = useState("");
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<PaymentsReport>("/reports/payments", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, supplierId: supplierId || undefined }),
    [dateFrom, dateTo, supplierId]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        <Form.Group style={{ maxWidth: 220 }}>
          <Form.Label className="small text-muted mb-1">المورد</Form.Label>
          <Form.Select size="sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">الكل</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex justify-content-center">
              <SummaryStat label="إجمالي المدفوعات" value={formatCurrency(data.total)} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className="bg-white fw-semibold">حسب المورد</Card.Header>
            <Card.Body className="p-0">
              {data.bySupplier.length === 0 ? (
                <EmptyState icon="bi-truck" title="لا توجد بيانات" />
              ) : (
                <Table responsive size="sm" className="mb-0">
                  <tbody>
                    {data.bySupplier.map((row) => (
                      <tr key={row.supplierId}>
                        <td>{row.name}</td>
                        <td className="text-end">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

export function ProfitReportView() {
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useDateRange();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<ProfitReport>("/reports/profit", { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [dateFrom, dateTo]
  );

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Body className="d-flex flex-wrap justify-content-around gap-3">
              <SummaryStat label="الإيرادات" value={formatCurrency(data.revenue)} />
              <SummaryStat label="تكلفة FIFO" value={formatCurrency(data.cost)} />
              <SummaryStat label="المصروفات" value={formatCurrency(data.expenses)} />
              <SummaryStat label="صافي الربح" value={formatCurrency(data.profit)} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className="bg-white fw-semibold">تفصيل حسب اليوم</Card.Header>
            <Card.Body className="p-0">
              {data.byPeriod.length === 0 ? (
                <EmptyState icon="bi-graph-up" title="لا توجد بيانات" />
              ) : (
                <Table responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th className="text-end">الإيرادات</th>
                      <th className="text-end">التكلفة</th>
                      <th className="text-end">المصروفات</th>
                      <th className="text-end">الربح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPeriod.map((row) => (
                      <tr key={row.date}>
                        <td>{formatDate(row.date)}</td>
                        <td className="text-end">{formatCurrency(row.revenue)}</td>
                        <td className="text-end">{formatCurrency(row.cost)}</td>
                        <td className="text-end">{formatCurrency(row.expenses)}</td>
                        <td className="text-end fw-semibold">{formatCurrency(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
