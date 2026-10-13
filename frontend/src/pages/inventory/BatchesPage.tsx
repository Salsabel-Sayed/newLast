import { useState } from "react";
import { Button, Card, Form, Modal, Table } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { BATCH_STATUS_LABELS } from "../../features/inventory/stockMovementLabels";
import { BATCH_SOURCE_LABELS, type Batch } from "./batch.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function BatchesPage() {
  const [searchParams] = useSearchParams();
  const rawMaterialId = searchParams.get("rawMaterialId") ?? "";
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [notesTarget, setNotesTarget] = useState<Batch | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { notify } = useToast();
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);
  const supplierNameById = new Map(suppliers.map((s) => [s._id, s.name]));

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<Batch>>("/batches", {
        rawMaterialId: rawMaterialId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [rawMaterialId, status, page]
  );

  const openNotesEditor = (batch: Batch) => {
    setNotesTarget(batch);
    setNotesValue(batch.notes ?? "");
  };

  const handleSaveNotes = async () => {
    if (!notesTarget) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/batches/${notesTarget._id}`, { notes: notesValue.trim() });
      notify("تم تحديث ملاحظات الدفعة بنجاح", "success");
      setNotesTarget(null);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="الدفعات (Batches)" description="سجل دفعات المخزون وفق منهج الوارد أولًا يصرف أولًا (FIFO)" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select
              style={{ maxWidth: 220 }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الحالات</option>
              <option value="active">نشطة</option>
              <option value="depleted">منتهية</option>
              <option value="locked">مقيَّدة للتصنيع فقط</option>
            </Form.Select>
            {rawMaterialId && (
              <span className="text-muted small">
                <i className="bi bi-funnel me-1" />
                مُصفّى حسب مادة خام محددة
              </span>
            )}
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-layers" title="لا توجد دفعات" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>كود الدفعة</th>
                  <th>المادة الخام</th>
                  <th>المصدر</th>
                  <th>المورد</th>
                  <th>تاريخ الشراء</th>
                  <th className="text-end">الكمية الأصلية</th>
                  <th className="text-end">المتبقي</th>
                  <th className="text-end">المحجوز</th>
                  <th className="text-end">تكلفة الكجم</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((batch) => {
                  const statusMeta = BATCH_STATUS_LABELS[batch.status] ?? {
                    label: batch.status,
                    variant: "secondary" as const,
                  };
                  return (
                    <tr key={batch._id}>
                      <td className="text-muted">{batch.batchCode}</td>
                      <td>
                        <div className="fw-semibold">{batch.rawMaterialName}</div>
                        <div className="text-muted small">{batch.rawMaterialCode}</div>
                      </td>
                      <td>{BATCH_SOURCE_LABELS[batch.source]}</td>
                      <td>{batch.supplierId ? (supplierNameById.get(batch.supplierId) ?? "—") : "—"}</td>
                      <td>{formatDate(batch.purchaseDate)}</td>
                      <td className="text-end">{formatNumber(batch.originalQty)}</td>
                      <td className="text-end">{formatNumber(batch.remainingQty)}</td>
                      <td className="text-end text-muted">{formatNumber(batch.reservedQty)}</td>
                      <td className="text-end">{formatCurrency(batch.unitCostPerKg)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                      <td className="text-end">
                        <Button variant="outline-secondary" size="sm" onClick={() => openNotesEditor(batch)}>
                          <i className="bi bi-pencil" />
                        </Button>
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

      <Modal show={notesTarget !== null} onHide={() => setNotesTarget(null)} centered dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title as="h6">ملاحظات الدفعة {notesTarget?.batchCode}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            as="textarea"
            rows={3}
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setNotesTarget(null)} disabled={submitting}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleSaveNotes} disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default BatchesPage;
