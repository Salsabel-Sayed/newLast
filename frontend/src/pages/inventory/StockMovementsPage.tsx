import { useState } from "react";
import { Badge, Card, Form, Table } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatDateTime, formatNumber } from "../../utils/format";
import type { RawMaterial } from "./rawMaterial.types";
import {
  relatedEntityTypeLabel,
  stockMovementDirectionLabel,
  stockMovementTypeLabel,
} from "../../features/inventory/stockMovementLabels";
import type { StockMovement } from "./stockMovement.types";

const DIRECTION_VARIANT: Record<StockMovement["direction"], string> = {
  in: "success",
  out: "danger",
  reserve: "warning",
  release: "info",
};

function StockMovementsPage() {
  const [searchParams] = useSearchParams();
  const rawMaterialId = searchParams.get("rawMaterialId") ?? "";
  const [movementType, setMovementType] = useState("");
  const [page, setPage] = useState(1);

  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials", true);
  const materialNameById = new Map(rawMaterials.map((m) => [m._id, m.name]));

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<StockMovement>>("/stock-movements", {
        rawMaterialId: rawMaterialId || undefined,
        movementType: movementType || undefined,
        page,
        limit: 25,
      }),
    [rawMaterialId, movementType, page]
  );

  return (
    <div>
      <PageHeader title="حركات المخزون" description="سجل تدقيق للقراءة فقط لجميع حركات المخزون" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select
              style={{ maxWidth: 260 }}
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل أنواع الحركات</option>
              <option value="opening_balance">رصيد افتتاحي</option>
              <option value="purchase_receipt">استلام مشتريات</option>
              <option value="sales_reservation">حجز للبيع</option>
              <option value="sales_reservation_release">إلغاء حجز</option>
              <option value="sales_issue">صرف بيع</option>
              <option value="sales_return">مرتجع بيع</option>
              <option value="returned_mix_in">إضافة توليفة مرتجعة</option>
              <option value="returned_mix_out">صرف توليفة مرتجعة</option>
              <option value="purchase_return">مرتجع شراء</option>
              <option value="stock_correction_increase">تصحيح مخزون (زيادة)</option>
              <option value="stock_correction_decrease">تصحيح مخزون (نقص)</option>
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
              <EmptyState icon="bi-arrow-left-right" title="لا توجد حركات مخزون" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>المادة الخام</th>
                  <th>نوع الحركة</th>
                  <th>الاتجاه</th>
                  <th className="text-end">الكمية (كجم)</th>
                  <th>المصدر</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((movement) => (
                  <tr key={movement._id}>
                    <td className="text-muted">{formatDateTime(movement.createdAt)}</td>
                    <td>
                      {movement.rawMaterialId
                        ? (materialNameById.get(movement.rawMaterialId) ?? "—")
                        : movement.returnedMixBatchId
                          ? "توليفة مرتجعة"
                          : "—"}
                    </td>
                    <td>{stockMovementTypeLabel(movement.movementType)}</td>
                    <td>
                      <Badge bg={DIRECTION_VARIANT[movement.direction]} className="fw-normal">
                        {stockMovementDirectionLabel(movement.direction)}
                      </Badge>
                    </td>
                    <td className="text-end fw-semibold">{formatNumber(movement.quantityKg)}</td>
                    <td className="text-muted small">{relatedEntityTypeLabel(movement.relatedEntityType)}</td>
                    <td className="text-muted small">{movement.notes || "—"}</td>
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
    </div>
  );
}

export default StockMovementsPage;
