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
import { formatCurrency, formatDate } from "../../utils/format";
import type { OpeningBalance } from "./openingBalance.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function OpeningBalancesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const confirm = useConfirm();
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<OpeningBalance>>("/opening-balances", {
        status: status || undefined,
        page,
        limit: 20,
      }),
    [status, page]
  );

  const handlePost = async (openingBalance: OpeningBalance) => {
    const confirmed = await confirm({
      title: "اعتماد الرصيد الافتتاحي",
      message: `سيتم إنشاء دفعات مخزون فعلية بناءً على "${openingBalance.openingNumber}". لا يمكن التراجع عن الاعتماد أو تعديله لاحقًا. هل تريد المتابعة؟`,
      confirmLabel: "اعتماد",
      variant: "primary",
    });
    if (!confirmed) return;

    try {
      await apiClient.post(`/opening-balances/${openingBalance._id}/post`);
      notify("تم اعتماد الرصيد الافتتاحي بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  return (
    <div>
      <PageHeader
        title="الرصيد الافتتاحي"
        description="إدخال أرصدة المخزون الموجودة فعليًا قبل بدء استخدام النظام"
        actions={
          <Link to="/inventory/opening-balances/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            رصيد افتتاحي جديد
          </Link>
        }
      />

      <Card>
        <Card.Header className="bg-white">
          <Form.Select
            style={{ maxWidth: 200 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="posted">معتمد</option>
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-clipboard-data" title="لا توجد أرصدة افتتاحية" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>التاريخ</th>
                  <th className="text-end">عدد الأصناف</th>
                  <th className="text-end">إجمالي القيمة</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((ob) => (
                  <tr key={ob._id}>
                    <td className="fw-semibold">{ob.openingNumber}</td>
                    <td>{formatDate(ob.openingDate)}</td>
                    <td className="text-end">{ob.items.length}</td>
                    <td className="text-end">
                      {formatCurrency(ob.items.reduce((sum, item) => sum + item.totalCost, 0))}
                    </td>
                    <td>
                      {ob.status === "posted" ? (
                        <StatusBadge label="معتمد" variant="success" />
                      ) : (
                        <StatusBadge label="مسودة" variant="secondary" />
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <Link to={`/inventory/opening-balances/${ob._id}`} className="btn btn-outline-secondary btn-sm me-1">
                        <i className="bi bi-eye" />
                      </Link>
                      {ob.status === "draft" && (
                        <Button variant="outline-success" size="sm" onClick={() => handlePost(ob)}>
                          <i className="bi bi-check-lg me-1" />
                          اعتماد
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
    </div>
  );
}

export default OpeningBalancesPage;
