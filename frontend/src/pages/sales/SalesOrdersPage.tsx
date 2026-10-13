import { useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import StatusBadge from "../../components/common/StatusBadge";
import { useConfirm } from "../../components/common/ConfirmProvider";
import ReasonPromptModal from "../../components/common/ReasonPromptModal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { computeOrderActualCost, SALES_ORDER_STATUS_LABELS, type SalesOrder } from "./salesOrder.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function SalesOrdersPage() {
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<SalesOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = useConfirm();
  const { notify } = useToast();
  const { items: customers } = useLookupList<Party>("/customers", true);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<SalesOrder>>("/sales-orders", {
        customerId: customerId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [customerId, status, page]
  );

  const handleConfirmOrder = async (order: SalesOrder) => {
    const confirmed = await confirm({
      title: "تأكيد أمر البيع",
      message: `سيتم حجز المخزون اللازم لتنفيذ "${order.orderNumber}". هل تريد المتابعة؟`,
      confirmLabel: "تأكيد",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/sales-orders/${order._id}/confirm`);
      notify("تم تأكيد أمر البيع وحجز المخزون بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleDeliverOrder = async (order: SalesOrder) => {
    const confirmed = await confirm({
      title: "تسليم أمر البيع",
      message: `سيتم صرف المخزون فعليًا وإنشاء فاتورة بيع لـ "${order.orderNumber}"، وتحديث رصيد العميل. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: "تسليم",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/sales-orders/${order._id}/deliver`);
      notify("تم تسليم أمر البيع وإنشاء فاتورة البيع بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleCancelSubmit = async (reason: string) => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/sales-orders/${cancelTarget._id}/cancel`, { cancellationReason: reason });
      notify("تم إلغاء أمر البيع", "success");
      setCancelTarget(null);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="أوامر البيع"
        actions={
          <Link to="/sales/orders/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            أمر بيع جديد
          </Link>
        }
      />

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
              <option value="draft">مسودة</option>
              <option value="confirmed">مؤكد</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">ملغى</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-cart-check" title="لا توجد أوامر بيع" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th className="text-end">التكلفة</th>
                  <th className="text-end">الإجمالي</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => {
                  const statusMeta = SALES_ORDER_STATUS_LABELS[order.status];
                  const actualCost = computeOrderActualCost(order);
                  return (
                    <tr key={order._id}>
                      <td className="fw-semibold">
                        <Link to={`/sales/orders/${order._id}`} className="text-decoration-none">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>{order.customerName}</td>
                      <td>{formatDate(order.orderDate)}</td>
                      <td className="text-end text-muted">
                        {actualCost === null ? "—" : formatCurrency(actualCost)}
                      </td>
                      <td className="text-end">{formatCurrency(order.totalAmount)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                      <td className="text-end text-nowrap">
                        {order.status === "draft" && (
                          <>
                            <Link to={`/sales/orders/${order._id}/edit`} className="btn btn-outline-secondary btn-sm me-1">
                              <i className="bi bi-pencil" />
                            </Link>
                            <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleConfirmOrder(order)}>
                              <i className="bi bi-check-lg" />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => setCancelTarget(order)}>
                              <i className="bi bi-x-lg" />
                            </Button>
                          </>
                        )}
                        {order.status === "confirmed" && (
                          <>
                            <Button variant="outline-success" size="sm" className="me-1" onClick={() => handleDeliverOrder(order)}>
                              <i className="bi bi-truck me-1" />
                              تسليم
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => setCancelTarget(order)}>
                              <i className="bi bi-x-lg" />
                            </Button>
                          </>
                        )}
                        {order.status === "delivered" && (
                          <Link
                            to={`/returns/new?customerId=${order.customerId}&salesOrderId=${order._id}`}
                            className="btn btn-outline-warning btn-sm"
                            title="إنشاء مرتجع"
                          >
                            <i className="bi bi-arrow-return-left" />
                          </Link>
                        )}
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

      <ReasonPromptModal
        show={cancelTarget !== null}
        title="إلغاء أمر البيع"
        label="سبب الإلغاء *"
        confirmLabel="تأكيد الإلغاء"
        submitting={submitting}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelSubmit}
      />
    </div>
  );
}

export default SalesOrdersPage;
