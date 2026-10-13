import { Button, Card, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import { PACKAGE_TYPE_LABELS } from "../../features/inventory/packageTypes";
import { computeReturnStatus } from "../returns/return.types";
import { useLinkedReturns } from "../returns/useLinkedReturns";
import LinkedReturnsSection from "../returns/LinkedReturnsSection";
import { PURCHASE_INVOICE_STATUS_LABELS, type PurchaseInvoice } from "./purchaseInvoice.types";

function PurchaseInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<PurchaseInvoice>(`/purchase-invoices/${id}`),
    [id]
  );

  const linkedReturns = useLinkedReturns({
    partyKind: "supplier",
    partyId: data?.supplierId,
    orderId: data?.purchaseOrderId,
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusMeta = PURCHASE_INVOICE_STATUS_LABELS[data.status];
  const returnStatusMeta = computeReturnStatus(data.totalAmount, linkedReturns.totalReturnsValue);
  const netTotal = data.totalAmount - linkedReturns.totalReturnsValue;

  return (
    <div>
      <PageHeader
        title={data.invoiceNumber}
        description={`${data.supplierName} — ${formatDate(data.invoiceDate)}`}
        actions={
          <>
            <Link to="/purchases/invoices" className="btn btn-outline-secondary no-print">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            <Link
              to={`/returns/new?returnType=purchase_return&supplierId=${data.supplierId}&purchaseOrderId=${data.purchaseOrderId}`}
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
              <div className="text-muted small">المورد</div>
              <div className="fw-semibold fs-5">{data.supplierName}</div>
            </div>
            <div className="text-end">
              <div className="text-muted small">رقم أمر الشراء المرجعي</div>
              <div className="fw-semibold">{data.purchaseOrderNumber}</div>
            </div>
          </div>

          <Table responsive className="mb-3 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th>نوع التعبئة</th>
                <th className="text-end">الكمية (كجم)</th>
                <th className="text-end">تكلفة الكجم</th>
                <th className="text-end">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.itemsSnapshot.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="fw-semibold">{item.rawMaterialName}</div>
                    <div className="text-muted small">{item.rawMaterialCode}</div>
                  </td>
                  <td>{item.packageType === "custom" ? item.customPackageName : PACKAGE_TYPE_LABELS[item.packageType]}</td>
                  <td className="text-end">{item.totalKg.toFixed(2)}</td>
                  <td className="text-end">{formatCurrency(item.unitCostPerKg)}</td>
                  <td className="text-end">{formatCurrency(item.totalCost)}</td>
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

export default PurchaseInvoiceDetailPage;
