import { Button, Card, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useConfirm } from "../../components/common/ConfirmProvider";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { PACKAGE_TYPE_LABELS } from "../../features/inventory/packageTypes";
import { computeReturnStatus } from "../returns/return.types";
import { useLinkedReturns } from "../returns/useLinkedReturns";
import LinkedReturnsSection from "../returns/LinkedReturnsSection";
import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrder } from "./purchaseOrder.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
    [id]
  );

  const linkedReturns = useLinkedReturns({
    partyKind: "supplier",
    partyId: data?.status === "received" ? data.supplierId : undefined,
    orderId: data?._id,
  });

  const handleReceive = async () => {
    if (!data) return;
    const confirmed = await confirm({
      title: "استلام أمر الشراء",
      message: "سيتم إنشاء دفعات مخزون وفاتورة شراء، وتحديث رصيد المورد. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟",
      confirmLabel: "استلام",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/purchase-orders/${data._id}/receive`);
      notify("تم استلام أمر الشراء وإنشاء فاتورة الشراء بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  const handleCancel = async () => {
    if (!data) return;
    const confirmed = await confirm({
      title: "إلغاء أمر الشراء",
      message: "هل أنت متأكد من إلغاء هذا الأمر؟",
      confirmLabel: "إلغاء الأمر",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await apiClient.post(`/purchase-orders/${data._id}/cancel`);
      notify("تم إلغاء أمر الشراء", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusMeta = PURCHASE_ORDER_STATUS_LABELS[data.status];
  const returnStatusMeta =
    data.status === "received" ? computeReturnStatus(data.totalAmount, linkedReturns.totalReturnsValue) : null;

  return (
    <div>
      <PageHeader
        title={data.orderNumber}
        description={`${data.supplierName} — ${formatDate(data.purchaseDate)}`}
        actions={
          <>
            <Link to="/purchases/orders" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            {data.status === "draft" && (
              <>
                <Button variant="outline-secondary" onClick={() => navigate(`/purchases/orders/${data._id}/edit`)}>
                  <i className="bi bi-pencil me-1" />
                  تعديل
                </Button>
                <Button variant="danger" onClick={handleCancel}>
                  <i className="bi bi-x-lg me-1" />
                  إلغاء
                </Button>
                <Button variant="success" onClick={handleReceive}>
                  <i className="bi bi-check-lg me-1" />
                  استلام
                </Button>
              </>
            )}
            {data.status === "received" && (
              <Link
                to={`/returns/new?returnType=purchase_return&supplierId=${data.supplierId}&purchaseOrderId=${data._id}`}
                className="btn btn-outline-warning"
              >
                <i className="bi bi-arrow-return-left me-1" />
                إنشاء مرتجع
              </Link>
            )}
          </>
        }
      />

      <div className="mb-3 d-flex gap-2">
        <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
        {returnStatusMeta && <StatusBadge label={returnStatusMeta.label} variant={returnStatusMeta.variant} />}
      </div>

      <Card>
        <Card.Header className="bg-white fw-semibold">الأصناف</Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th>نوع التعبئة</th>
                <th className="text-end">عدد العبوات</th>
                <th className="text-end">وزن العبوة</th>
                <th className="text-end">الإجمالي (كجم)</th>
                <th className="text-end">تكلفة الكجم</th>
                <th className="text-end">إجمالي التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="fw-semibold">{item.rawMaterialName}</div>
                    <div className="text-muted small">{item.rawMaterialCode}</div>
                  </td>
                  <td>{item.packageType === "custom" ? item.customPackageName : PACKAGE_TYPE_LABELS[item.packageType]}</td>
                  <td className="text-end">{formatNumber(item.packageCount)}</td>
                  <td className="text-end">{formatNumber(item.kgPerPackage)}</td>
                  <td className="text-end">{formatNumber(item.totalKg)}</td>
                  <td className="text-end">{formatCurrency(item.unitCostPerKg)}</td>
                  <td className="text-end">{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-bold">
                <td colSpan={4} className="text-end">
                  الإجمالي
                </td>
                <td className="text-end">{formatNumber(data.totalKg)}</td>
                <td></td>
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

      {data.status === "received" && (
        <div className="mt-3">
          <LinkedReturnsSection
            returns={linkedReturns.items}
            loading={linkedReturns.loading}
            error={linkedReturns.error}
            onRetry={linkedReturns.reload}
          />
        </div>
      )}
    </div>
  );
}

export default PurchaseOrderDetailPage;
