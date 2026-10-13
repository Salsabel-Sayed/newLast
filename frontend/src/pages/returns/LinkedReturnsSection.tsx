import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatDate } from "../../utils/format";
import { RETURN_TYPE_LABELS, type ReturnRecord } from "./return.types";
import ReturnLineItemsTable from "./ReturnLineItemsTable";

interface LinkedReturnsSectionProps {
  returns: ReturnRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function LinkedReturnsSection({ returns, loading, error, onRetry }: LinkedReturnsSectionProps) {
  return (
    <Card>
      <Card.Header className="bg-white fw-semibold">المرتجعات المرتبطة</Card.Header>
      <Card.Body className="p-0">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
        {!loading && !error && returns.length === 0 && (
          <div className="p-4">
            <EmptyState icon="bi-arrow-return-left" title="لا توجد مرتجعات مرتبطة بهذا المستند" />
          </div>
        )}
        {!loading && !error && returns.length > 0 && (
          <div>
            {returns.map((r) => (
              <div key={r._id} className="border-bottom p-3">
                <div className="mb-2">
                  <Link to={`/returns/${r._id}`} className="fw-semibold text-decoration-none">
                    {r.returnNumber}
                  </Link>
                  <span className="text-muted small ms-2">
                    {RETURN_TYPE_LABELS[r.returnType]} — {formatDate(r.returnDate)}
                  </span>
                </div>
                <ReturnLineItemsTable items={r.items} returnType={r.returnType} />
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default LinkedReturnsSection;
