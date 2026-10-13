import { useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import { RETURN_TYPE_LABELS, type ReturnRecord, type ReturnType } from "./return.types";

function ReturnsPage() {
  const [returnType, setReturnType] = useState<ReturnType | "">("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<ReturnRecord>>("/returns", {
        returnType: returnType || undefined,
        page,
        limit: 20,
      }),
    [returnType, page]
  );

  return (
    <div>
      <PageHeader
        title="المرتجعات"
        actions={
          <Link to="/returns/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            مرتجع جديد
          </Link>
        }
      />

      <Card>
        <Card.Header className="bg-white">
          <Form.Select
            style={{ maxWidth: 260 }}
            value={returnType}
            onChange={(e) => {
              setReturnType(e.target.value as ReturnType | "");
              setPage(1);
            }}
          >
            <option value="">كل الأنواع</option>
            {Object.entries(RETURN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-arrow-return-left" title="لا توجد مرتجعات" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>النوع</th>
                  <th>الطرف</th>
                  <th>التاريخ</th>
                  <th className="text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r._id}>
                    <td className="fw-semibold">
                      <Link to={`/returns/${r._id}`} className="text-decoration-none">
                        {r.returnNumber}
                      </Link>
                    </td>
                    <td>{RETURN_TYPE_LABELS[r.returnType]}</td>
                    <td>{r.customerName ?? r.supplierName ?? "—"}</td>
                    <td>{formatDate(r.returnDate)}</td>
                    <td className="text-end">{formatCurrency(r.totalAmount)}</td>
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

export default ReturnsPage;
