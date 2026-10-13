import { useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import StatusBadge from "../../components/common/StatusBadge";
import ReasonPromptModal from "../../components/common/ReasonPromptModal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import { PAYMENT_METHOD_LABELS, type Payment, type PaymentDirection } from "./payment.types";
import PaymentFormModal from "./PaymentFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

interface PaymentListPageProps {
  direction: PaymentDirection;
  title: string;
  icon: string;
}

function PaymentListPage({ direction, title, icon }: PaymentListPageProps) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<Payment>>("/payments", {
        direction,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [direction, status, page]
  );

  const handleCreate = async (values: {
    partyId: string;
    amount: number;
    paymentDate: string;
    method: Payment["method"];
    relatedInvoiceId?: string;
  }) => {
    setSubmitting(true);
    try {
      const payload = {
        direction,
        ...(direction === "collection" ? { customerId: values.partyId } : { supplierId: values.partyId }),
        amount: values.amount,
        paymentDate: values.paymentDate,
        method: values.method,
        ...(values.relatedInvoiceId ? { relatedInvoiceId: values.relatedInvoiceId } : {}),
      };
      await apiClient.post("/payments", payload);
      notify(direction === "collection" ? "تم تسجيل التحصيل بنجاح" : "تم تسجيل السداد بنجاح", "success");
      setFormOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidSubmit = async (voidReason: string) => {
    if (!voidTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/payments/${voidTarget._id}/void`, { voidReason });
      notify("تم إلغاء العملية بنجاح", "success");
      setVoidTarget(null);
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
        title={title}
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <i className="bi bi-plus-lg me-1" />
            {direction === "collection" ? "تحصيل جديد" : "سداد جديد"}
          </Button>
        }
      />

      <Card>
        <Card.Header className="bg-white">
          <Form.Select
            style={{ maxWidth: 180 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="completed">مكتملة</option>
            <option value="voided">ملغاة</option>
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon={icon} title={`لا توجد ${title}`} />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>{direction === "collection" ? "العميل" : "المورد"}</th>
                  <th>التاريخ</th>
                  <th>طريقة الدفع</th>
                  <th className="text-end">المبلغ</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((payment) => (
                  <tr key={payment._id}>
                    <td className="fw-semibold">{payment.paymentNumber}</td>
                    <td>{payment.customerName ?? payment.supplierName}</td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{PAYMENT_METHOD_LABELS[payment.method]}</td>
                    <td className="text-end">{formatCurrency(payment.amount)}</td>
                    <td>
                      {payment.status === "completed" ? (
                        <StatusBadge label="مكتملة" variant="success" />
                      ) : (
                        <StatusBadge label="ملغاة" variant="danger" />
                      )}
                    </td>
                    <td className="text-end">
                      {payment.status === "completed" && (
                        <Button variant="outline-danger" size="sm" onClick={() => setVoidTarget(payment)}>
                          <i className="bi bi-x-lg me-1" />
                          إلغاء
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
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

      <PaymentFormModal
        show={formOpen}
        direction={direction}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <ReasonPromptModal
        show={voidTarget !== null}
        title="إلغاء العملية"
        label="سبب الإلغاء *"
        confirmLabel="تأكيد الإلغاء"
        submitting={submitting}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidSubmit}
      />
    </div>
  );
}

export default PaymentListPage;
