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
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import type { Recipe } from "../recipes/recipe.types";
import { RETURNED_MIX_STATUS_LABELS, type ReturnedMixBatch } from "./returnedMixBatch.types";
import ConvertToLossModal from "./ConvertToLossModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function ReturnedMixAreaPage() {
  const [recipeId, setRecipeId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lossTarget, setLossTarget] = useState<ReturnedMixBatch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { notify } = useToast();
  const { items: recipes } = useLookupList<Recipe>("/recipes", true);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<ReturnedMixBatch>>("/returned-mixes", {
        recipeId: recipeId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [recipeId, status, page]
  );

  const handleConvert = async (quantityKg: number) => {
    if (!lossTarget) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/returned-mixes/${lossTarget._id}/loss`, { quantityKg });
      notify("تم تحويل الكمية إلى خسارة بنجاح", "success");
      setLossTarget(null);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="منطقة التوليفات المرتجعة" description="مخزون مستقل تمامًا عن المواد الخام" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select style={{ maxWidth: 220 }} value={recipeId} onChange={(e) => { setRecipeId(e.target.value); setPage(1); }}>
              <option value="">كل التوليفات</option>
              {recipes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
            <Form.Select style={{ maxWidth: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">كل الحالات</option>
              <option value="active">نشطة</option>
              <option value="depleted">منتهية</option>
              <option value="disposed">تم إتلافها</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-recycle" title="لا توجد توليفات مرتجعة" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>التوليفة</th>
                  <th>تاريخ الإرجاع</th>
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
                  const statusMeta = RETURNED_MIX_STATUS_LABELS[batch.status];
                  const availableQty = batch.remainingQty - batch.reservedQty;
                  return (
                    <tr key={batch._id}>
                      <td className="fw-semibold">{batch.recipeName}</td>
                      <td>{formatDate(batch.returnDate)}</td>
                      <td className="text-end">{formatNumber(batch.originalQty)}</td>
                      <td className="text-end">{formatNumber(batch.remainingQty)}</td>
                      <td className="text-end text-muted">{formatNumber(batch.reservedQty)}</td>
                      <td className="text-end">{formatCurrency(batch.unitCostPerKg)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                      <td className="text-end">
                        {batch.status === "active" && availableQty > 0 && (
                          <Button variant="outline-danger" size="sm" onClick={() => setLossTarget(batch)}>
                            <i className="bi bi-trash3 me-1" />
                            تحويل لخسارة
                          </Button>
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

      <ConvertToLossModal batch={lossTarget} submitting={submitting} onClose={() => setLossTarget(null)} onConfirm={handleConvert} />
    </div>
  );
}

export default ReturnedMixAreaPage;
