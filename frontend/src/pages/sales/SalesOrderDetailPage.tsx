import { useState } from "react";
import { Button, Card, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useConfirm } from "../../components/common/ConfirmProvider";
import ReasonPromptModal from "../../components/common/ReasonPromptModal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { computeReturnStatus } from "../returns/return.types";
import { useLinkedReturns } from "../returns/useLinkedReturns";
import LinkedReturnsSection from "../returns/LinkedReturnsSection";
import {
  DELIVERY_METHOD_LABELS,
  ITEM_TYPE_LABELS,
  SALES_ORDER_STATUS_LABELS,
  type SalesOrder,
} from "./salesOrder.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function itemDisplayName(item: SalesOrder["items"][number]): string {
  if (item.itemType === "raw_material") return item.rawMaterialName ?? "—";
  return item.recipeName ?? "—";
}

function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();
  const { notify } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<SalesOrder>(`/sales-orders/${id}`),
    [id]
  );

  const linkedReturns = useLinkedReturns({
    partyKind: "customer",
    partyId: data?.status === "delivered" ? data.customerId : undefined,
    orderId: data?._id,
  });

  const handleConfirmOrder = async () => {
    if (!data) return;
    const confirmed = await confirmDialog({
      title: "تأكيد أمر البيع",
      message: "سيتم حجز المخزون اللازم لتنفيذ هذا الأمر. هل تريد المتابعة؟",
      confirmLabel: "تأكيد",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/sales-orders/${data._id}/confirm`);
      notify("تم تأكيد أمر البيع وحجز المخزون بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleDeliverOrder = async () => {
    if (!data) return;
    const confirmed = await confirmDialog({
      title: "تسليم أمر البيع",
      message: "سيتم صرف المخزون فعليًا وإنشاء فاتورة بيع، وتحديث رصيد العميل. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟",
      confirmLabel: "تسليم",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/sales-orders/${data._id}/deliver`);
      notify("تم تسليم أمر البيع وإنشاء فاتورة البيع بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleCancelSubmit = async (reason: string) => {
    if (!data) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/sales-orders/${data._id}/cancel`, { cancellationReason: reason });
      notify("تم إلغاء أمر البيع", "success");
      setCancelOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusMeta = SALES_ORDER_STATUS_LABELS[data.status];
  const returnStatusMeta =
    data.status === "delivered" ? computeReturnStatus(data.totalAmount, linkedReturns.totalReturnsValue) : null;

  return (
    <div>
      <PageHeader
        title={data.orderNumber}
        description={`${data.customerName} — ${formatDate(data.orderDate)}`}
        actions={
          <>
            <Link to="/sales/orders" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            {data.status === "draft" && (
              <>
                <Button variant="outline-secondary" onClick={() => navigate(`/sales/orders/${data._id}/edit`)}>
                  <i className="bi bi-pencil me-1" />
                  تعديل
                </Button>
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  <i className="bi bi-x-lg me-1" />
                  إلغاء
                </Button>
                <Button variant="primary" onClick={handleConfirmOrder}>
                  <i className="bi bi-check-lg me-1" />
                  تأكيد
                </Button>
              </>
            )}
            {data.status === "confirmed" && (
              <>
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  <i className="bi bi-x-lg me-1" />
                  إلغاء
                </Button>
                <Button variant="success" onClick={handleDeliverOrder}>
                  <i className="bi bi-truck me-1" />
                  تسليم
                </Button>
              </>
            )}
            {data.status === "delivered" && (
              <Link
                to={`/returns/new?customerId=${data.customerId}&salesOrderId=${data._id}`}
                className="btn btn-outline-warning"
              >
                <i className="bi bi-arrow-return-left me-1" />
                إنشاء مرتجع
              </Link>
            )}
          </>
        }
      />

      <div className="mb-3 d-flex align-items-center gap-2">
        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
        {returnStatusMeta && <StatusBadge label={returnStatusMeta.label} variant={returnStatusMeta.variant} />}
        <span className="text-muted small">طريقة التسليم: {DELIVERY_METHOD_LABELS[data.deliveryMethod]}</span>
      </div>

      {data.status === "cancelled" && data.cancellationReason && (
        <Card className="mb-3 border-danger">
          <Card.Body className="py-2">
            <span className="text-danger fw-semibold">سبب الإلغاء: </span>
            {data.cancellationReason}
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header className="bg-white fw-semibold">الأصناف</Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0 align-middle">
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
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="fw-semibold">{itemDisplayName(item)}</td>
                  <td className="text-muted small">{ITEM_TYPE_LABELS[item.itemType]}</td>
                  <td className="text-end">{formatNumber(item.quantityKg)}</td>
                  <td className="text-end text-muted">{data.status === "draft" ? "—" : formatCurrency(item.costPerKg)}</td>
                  <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-end">{item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "—"}</td>
                  <td className="text-end fw-semibold">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="text-end text-muted">
                  الإجمالي الفرعي
                </td>
                <td className="text-end">{formatCurrency(data.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="text-end text-muted">
                  إجمالي الخصم
                </td>
                <td className="text-end">{formatCurrency(data.discountAmount)}</td>
              </tr>
              <tr className="fw-bold">
                <td colSpan={6} className="text-end">
                  الإجمالي
                </td>
                <td className="text-end">{formatCurrency(data.totalAmount)}</td>
              </tr>
            </tfoot>
          </Table>
        </Card.Body>
      </Card>

      {data.notes && (
        <Card className="mt-3">
          <Card.Body>
            <div className="text-muted small mb-1">ملاحظات</div>
            <div>{data.notes}</div>
          </Card.Body>
        </Card>
      )}

      {data.status === "delivered" && (
        <div className="mt-3">
          <LinkedReturnsSection
            returns={linkedReturns.items}
            loading={linkedReturns.loading}
            error={linkedReturns.error}
            onRetry={linkedReturns.reload}
          />
        </div>
      )}

      <ReasonPromptModal
        show={cancelOpen}
        title="إلغاء أمر البيع"
        label="سبب الإلغاء *"
        confirmLabel="تأكيد الإلغاء"
        submitting={submitting}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelSubmit}
      />
    </div>
  );
}

export default SalesOrderDetailPage;
