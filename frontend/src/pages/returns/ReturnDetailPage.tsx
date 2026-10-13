import { Card } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/format";
import { RETURN_TYPE_LABELS, type ReturnRecord } from "./return.types";
import ReturnLineItemsTable from "./ReturnLineItemsTable";

function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<ReturnRecord>(`/returns/${id}`),
    [id]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title={data.returnNumber}
        description={`${RETURN_TYPE_LABELS[data.returnType]} — ${formatDate(data.returnDate)}`}
        actions={
          <Link to="/returns" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-right me-1" />
            رجوع للقائمة
          </Link>
        }
      />

      <Card className="mb-3">
        <Card.Body className="d-flex flex-wrap justify-content-between gap-3">
          <div>
            <div className="text-muted small">{data.customerId ? "العميل" : "المورد"}</div>
            <div className="fw-semibold fs-5">{data.customerName ?? data.supplierName}</div>
          </div>
          {data.salesOrderId && (
            <div className="text-end">
              <div className="text-muted small">أمر البيع الأصلي</div>
              <Link to={`/sales/orders/${data.salesOrderId}`} className="fw-semibold text-decoration-none">
                عرض الأمر <i className="bi bi-box-arrow-in-left ms-1" />
              </Link>
            </div>
          )}
          {data.purchaseOrderId && (
            <div className="text-end">
              <div className="text-muted small">أمر الشراء الأصلي</div>
              <Link to={`/purchases/orders/${data.purchaseOrderId}`} className="fw-semibold text-decoration-none">
                عرض الأمر <i className="bi bi-box-arrow-in-left ms-1" />
              </Link>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="bg-white fw-semibold">الأصناف</Card.Header>
        <Card.Body className="p-0">
          <ReturnLineItemsTable items={data.items} returnType={data.returnType} />
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
    </div>
  );
}

export default ReturnDetailPage;
