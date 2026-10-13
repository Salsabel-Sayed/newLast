import { useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import StatusBadge from "../../components/common/StatusBadge";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { SALES_INVOICE_STATUS_LABELS, type SalesInvoice } from "./salesInvoice.types";

function SalesInvoicesPage() {
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { items: customers } = useLookupList<Party>("/customers", true);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<SalesInvoice>>("/sales-invoices", {
        customerId: customerId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [customerId, status, page]
  );

  return (
    <div>
      <PageHeader title="فواتير البيع" description="تُنشأ تلقائيًا عند تسليم أوامر البيع" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select style={{ maxWidth: 220 }} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}>
              <option value="">كل العملاء</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
            <Form.Select style={{ maxWidth: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">كل الحالات</option>
              <option value="unpaid">غير مدفوعة</option>
              <option value="partial">مدفوعة جزئيًا</option>
              <option value="paid">مدفوعة بالكامل</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-receipt-cutoff" title="لا توجد فواتير بيع" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th className="text-end">الإجمالي</th>
                  <th className="text-end">المدفوع</th>
                  <th className="text-end">المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((invoice) => {
                  const statusMeta = SALES_INVOICE_STATUS_LABELS[invoice.status];
                  return (
                    <tr key={invoice._id}>
                      <td className="fw-semibold">
                        <Link to={`/sales/invoices/${invoice._id}`} className="text-decoration-none">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td>{invoice.customerName}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td className="text-end">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="text-end">{formatCurrency(invoice.paidAmount)}</td>
                      <td className="text-end">{formatCurrency(invoice.remainingAmount)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {data && data.totalPages > 1 && (
          <Card.Footer className="bg-white">
            <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </Card.Footer>
        )}
      </Card>
    </div>
  );
}

export default SalesInvoicesPage;
