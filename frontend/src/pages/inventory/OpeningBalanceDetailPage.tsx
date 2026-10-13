import { Button, Card, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
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
import type { OpeningBalance } from "./openingBalance.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function OpeningBalanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<OpeningBalance>(`/opening-balances/${id}`),
    [id]
  );

  const handlePost = async () => {
    if (!data) return;
    const confirmed = await confirm({
      title: "اعتماد الرصيد الافتتاحي",
      message: "سيتم إنشاء دفعات مخزون فعلية بناءً على هذا الرصيد. لا يمكن التراجع عن الاعتماد أو تعديله لاحقًا. هل تريد المتابعة؟",
      confirmLabel: "اعتماد",
      variant: "primary",
    });
    if (!confirmed) return;

    try {
      await apiClient.post(`/opening-balances/${data._id}/post`);
      notify("تم اعتماد الرصيد الافتتاحي بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const grandTotalCost = data.items.reduce((sum, item) => sum + item.totalCost, 0);
  const grandTotalKg = data.items.reduce((sum, item) => sum + item.totalKg, 0);

  return (
    <div>
      <PageHeader
        title={data.openingNumber}
        description={`تاريخ الرصيد: ${formatDate(data.openingDate)}`}
        actions={
          <>
            <Link to="/inventory/opening-balances" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            {data.status === "draft" && (
              <Button variant="success" onClick={handlePost}>
                <i className="bi bi-check-lg me-1" />
                اعتماد
              </Button>
            )}
          </>
        }
      />

      <div className="mb-3">
        {data.status === "posted" ? (
          <StatusBadge label="معتمد" variant="success" />
        ) : (
          <StatusBadge label="مسودة" variant="secondary" />
        )}
      </div>

      <Card>
        <Card.Header className="bg-white fw-semibold">الأصناف</Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th>المورد</th>
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
                  <td>{item.supplierName || "—"}</td>
                  <td>
                    {item.packageType === "custom" ? item.customPackageName : PACKAGE_TYPE_LABELS[item.packageType]}
                  </td>
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
                <td colSpan={5} className="text-end">
                  الإجمالي
                </td>
                <td className="text-end">{formatNumber(grandTotalKg)}</td>
                <td></td>
                <td className="text-end">{formatCurrency(grandTotalCost)}</td>
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
    </div>
  );
}

export default OpeningBalanceDetailPage;
