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
import { PURCHASE_INVOICE_STATUS_LABELS, type PurchaseInvoice } from "./purchaseInvoice.types";

function PurchaseInvoicesPage() {
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<PurchaseInvoice>>("/purchase-invoices", {
        supplierId: supplierId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [supplierId, status, page]
  );

  return (
    <div>
      <PageHeader title="فواتير الشراء" description="تُنشأ تلقائيًا عند استلام أوامر الشراء" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select style={{ maxWidth: 220 }} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}>
              <option value="">كل الموردين</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
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
              <EmptyState icon="bi-receipt" title="لا توجد فواتير شراء" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th className="text-end">الإجمالي</th>
                  <th className="text-end">المدفوع</th>
                  <th className="text-end">المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((invoice) => {
                  const statusMeta = PURCHASE_INVOICE_STATUS_LABELS[invoice.status];
                  return (
                    <tr key={invoice._id}>
                      <td className="fw-semibold">
                        <Link to={`/purchases/invoices/${invoice._id}`} className="text-decoration-none">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td>{invoice.supplierName}</td>
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

export default PurchaseInvoicesPage;
