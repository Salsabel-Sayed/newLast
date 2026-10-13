import { useState } from "react";
import { Badge, Button, Card, Table } from "react-bootstrap";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate, formatNumber } from "../../utils/format";
import type { StockCorrection } from "./stockCorrection.types";
import NewStockCorrectionModal from "./NewStockCorrectionModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function StockCorrectionsPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<PaginatedResult<StockCorrection>>("/stock-corrections", { page, limit: 20 }),
    [page]
  );

  const handleSubmit = async (payload: {
    batchId: string;
    quantityAfterKg: number;
    reason: string;
    correctionDate: string;
    notes: string;
  }) => {
    setSubmitting(true);
    try {
      await apiClient.post("/stock-corrections", payload);
      notify("تم تسجيل تصحيح المخزون بنجاح", "success");
      setFormOpen(false);
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
        title="تصحيح المخزون"
        description="تصحيح كمية دفعة موجودة عبر حركة مخزون موثّقة، دون أي تعديل مباشر على الأرصدة"
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <i className="bi bi-plus-lg me-1" />
            تصحيح جديد
          </Button>
        }
      />

      <Card>
        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-tools" title="لا توجد عمليات تصحيح مخزون" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>التاريخ</th>
                  <th>المادة الخام</th>
                  <th>الدفعة</th>
                  <th className="text-end">قبل</th>
                  <th className="text-end">بعد</th>
                  <th className="text-end">الفرق</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((correction) => (
                  <tr key={correction._id}>
                    <td className="fw-semibold">{correction.correctionNumber}</td>
                    <td>{formatDate(correction.correctionDate)}</td>
                    <td>
                      <div>{correction.rawMaterialName}</div>
                      <div className="text-muted small">{correction.rawMaterialCode}</div>
                    </td>
                    <td>{correction.batchCode}</td>
                    <td className="text-end">{formatNumber(correction.quantityBeforeKg)}</td>
                    <td className="text-end">{formatNumber(correction.quantityAfterKg)}</td>
                    <td className="text-end">
                      <Badge bg={correction.differenceKg >= 0 ? "success" : "danger"} className="fw-normal">
                        {correction.differenceKg > 0 ? "+" : ""}
                        {formatNumber(correction.differenceKg)}
                      </Badge>
                    </td>
                    <td className="text-muted small">{correction.reason}</td>
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

      <NewStockCorrectionModal
        show={formOpen}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default StockCorrectionsPage;
