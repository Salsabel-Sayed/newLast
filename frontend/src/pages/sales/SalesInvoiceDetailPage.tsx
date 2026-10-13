import { Button, Card, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import { computeReturnStatus } from "../returns/return.types";
import { useLinkedReturns } from "../returns/useLinkedReturns";
import LinkedReturnsSection from "../returns/LinkedReturnsSection";
import { ITEM_TYPE_LABELS } from "./salesOrder.types";
import { SALES_INVOICE_STATUS_LABELS, type SalesInvoice } from "./salesInvoice.types";

function itemDisplayName(item: SalesInvoice["itemsSnapshot"][number]): string {
  if (item.itemType === "raw_material") return item.rawMaterialName ?? "—";
  return item.recipeName ?? "—";
}

function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<SalesInvoice>(`/sales-invoices/${id}`),
    [id]
  );

  const linkedReturns = useLinkedReturns({
    partyKind: "customer",
    partyId: data?.customerId,
    orderId: data?.salesOrderId,
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusMeta = SALES_INVOICE_STATUS_LABELS[data.status];
  const returnStatusMeta = computeReturnStatus(data.totalAmount, linkedReturns.totalReturnsValue);
  const netTotal = data.totalAmount - linkedReturns.totalReturnsValue;

  return (
    <div>
      <PageHeader
        title={data.invoiceNumber}
        description={`${data.customerName} — ${formatDate(data.invoiceDate)}`}
        actions={
          <>
            <Link to="/sales/invoices" className="btn btn-outline-secondary no-print">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            <Link
              to={`/returns/new?customerId=${data.customerId}&salesOrderId=${data.salesOrderId}`}
              className="btn btn-outline-warning no-print"
            >
              <i className="bi bi-arrow-return-left me-1" />
              إنشاء مرتجع
            </Link>
            <Button variant="primary" className="no-print" onClick={() => window.print()}>
              <i className="bi bi-printer me-1" />
              طباعة
            </Button>
          </>
        }
      />

      <div className="mb-3 no-print d-flex gap-2">
        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
        {returnStatusMeta && <StatusBadge label={returnStatusMeta.label} variant={returnStatusMeta.variant} />}
      </div>

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between flex-wrap mb-3 pb-3 border-bottom">
            <div>
              <div className="text-muted small">العميل</div>
              <div className="fw-semibold fs-5">{data.customerName}</div>
            </div>
            <div className="text-end">
              <div className="text-muted small">رقم أمر البيع المرجعي</div>
              <div className="fw-semibold">{data.salesOrderNumber}</div>
            </div>
          </div>

          <Table responsive className="mb-3 align-middle">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>النوع</th>
                <th className="text-end">الكمية (كجم)</th>
                <th className="text-end">تكلفة الكجم</th>
                <th className="text-end">سعر الوحدة</th>
                <th className="text-end">الخصم</th>
                <th className="text-end">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.itemsSnapshot.map((item, index) => (
                <tr key={index}>
                  <td className="fw-semibold">{itemDisplayName(item)}</td>
                  <td className="text-muted small">{ITEM_TYPE_LABELS[item.itemType]}</td>
                  <td className="text-end">{item.quantityKg.toFixed(2)}</td>
                  <td className="text-end text-muted">{formatCurrency(item.costPerKg)}</td>
                  <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-end">{item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "—"}</td>
                  <td className="text-end">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="row justify-content-end">
            <div className="col-md-6">
              <Table borderless size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted">الرصيد السابق</td>
                    <td className="text-end">{formatCurrency(data.previousBalance)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">إجمالي الفاتورة</td>
                    <td className="text-end fw-semibold">{formatCurrency(data.totalAmount)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">إجمالي قيمة المرتجعات</td>
                    <td className="text-end text-danger">
                      {linkedReturns.totalReturnsValue > 0 ? `- ${formatCurrency(linkedReturns.totalReturnsValue)}` : formatCurrency(0)}
                    </td>
                  </tr>
                  <tr className="border-top">
                    <td className="fw-bold pt-2">صافي الفاتورة بعد المرتجعات</td>
                    <td className="text-end fw-bold pt-2">{formatCurrency(netTotal)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pt-2">المدفوع</td>
                    <td className="text-end pt-2">{formatCurrency(data.paidAmount)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">المتبقي</td>
                    <td className="text-end">{formatCurrency(data.remainingAmount)}</td>
                  </tr>
                  <tr className="border-top">
                    <td className="fw-bold pt-2">الرصيد الحالي</td>
                    <td className="text-end fw-bold pt-2">{formatCurrency(data.currentBalance)}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="no-print">
        <LinkedReturnsSection
          returns={linkedReturns.items}
          loading={linkedReturns.loading}
          error={linkedReturns.error}
          onRetry={linkedReturns.reload}
        />
      </div>
    </div>
  );
}

export default SalesInvoiceDetailPage;
