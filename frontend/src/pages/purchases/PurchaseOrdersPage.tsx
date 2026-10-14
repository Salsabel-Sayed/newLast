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
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrder } from "./purchaseOrder.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function PurchaseOrdersPage() {
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const confirm = useConfirm();
  const { notify } = useToast();
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<PurchaseOrder>>("/purchase-orders", {
        supplierId: supplierId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [supplierId, status, page]
  );

  const handleReceive = async (order: PurchaseOrder) => {
    const confirmed = await confirm({
      title: "استلام أمر الشراء",
      message: `سيتم إنشاء دفعات مخزون وفاتورة شراء بناءً على "${order.orderNumber}"، وتحديث رصيد المورد. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: "استلام",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/purchase-orders/${order._id}/receive`);
      notify("تم استلام أمر الشراء وإنشاء فاتورة الشراء بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleCancel = async (order: PurchaseOrder) => {
    const confirmed = await confirm({
      title: "إلغاء أمر الشراء",
      message: `هل أنت متأكد من إلغاء "${order.orderNumber}"؟`,
      confirmLabel: "إلغاء الأمر",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/purchase-orders/${order._id}/cancel`);
      notify("تم إلغاء أمر الشراء", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  return (
    <div>
      <PageHeader
        title="أوامر الشراء"
        actions={
          <Link to="/purchases/orders/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            أمر شراء جديد
          </Link>
        }
      />

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
            <Form.Select style={{ maxWidth: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="received">مستلم</option>
              <option value="cancelled">ملغي</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-cart" title="لا توجد أوامر شراء" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th className="text-end">الكمية (كجم)</th>
                  <th className="text-end">الإجمالي</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => {
                  const statusMeta = PURCHASE_ORDER_STATUS_LABELS[order.status];
                  return (
                    <tr key={order._id}>
                      <td className="fw-semibold">
                        <Link to={`/purchases/orders/${order._id}`} className="text-decoration-none">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>{order.supplierName}</td>
                      <td>{formatDate(order.purchaseDate)}</td>
                      <td className="text-end">{formatNumber(order.totalKg)}</td>
                      <td className="text-end">{formatCurrency(order.totalAmount)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                      <td className="text-end text-nowrap">
                        {order.status === "draft" && (
                          <>
                            <Link to={`/purchases/orders/${order._id}/edit`} className="btn btn-outline-secondary btn-sm me-1">
                              <i className="bi bi-pencil" />
                            </Link>
                            <Button variant="outline-success" size="sm" className="me-1" onClick={() => handleReceive(order)}>
                              <i className="bi bi-check-lg" />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleCancel(order)}>
                              <i className="bi bi-x-lg" />
                            </Button>
                          </>
                        )}
                        {order.status === "received" && (
                          <Link
                            to={`/returns/new?returnType=purchase_return&supplierId=${order.supplierId}&purchaseOrderId=${order._id}`}
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
    </div>
  );
}

export default PurchaseOrdersPage;
