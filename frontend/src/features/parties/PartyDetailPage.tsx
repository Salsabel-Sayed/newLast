import { useState } from "react";
import { Badge, Button, Card, Col, Row, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import { ledgerSourceTypeLabel } from "../ledger/ledgerLabels";
import type { Party, PartyConfig, PartyFormValues, StatementLine } from "./party.types";
import PartyFormModal from "./PartyFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

interface PartyDetailPageProps {
  config: PartyConfig;
}

function PartyDetailPage({ config }: PartyDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();

  const partyResource = useApiResource(
    () => apiClient.get<Party>(`${config.apiBasePath}/${id}`),
    [config.apiBasePath, id]
  );

  const statementResource = useApiResource(
    () => apiClient.get<StatementLine[]>(`${config.apiBasePath}/${id}/statement`),
    [config.apiBasePath, id]
  );

  const handleFormSubmit = async (values: PartyFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: values.address.trim(),
        isActive: values.isActive,
        notes: values.notes.trim(),
      };
      await apiClient.put(`${config.apiBasePath}/${id}`, payload);
      notify(`تم تحديث بيانات ${config.singularLabel} بنجاح`, "success");
      setFormOpen(false);
      partyResource.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (partyResource.loading) return <LoadingState />;
  if (partyResource.error) return <ErrorState message={partyResource.error} onRetry={partyResource.reload} />;
  if (!partyResource.data) return null;

  const party = partyResource.data;

  return (
    <div>
      <PageHeader
        title={party.name}
        description={`${config.singularLabel} — كود ${party.code}`}
        actions={
          <>
            <Link to={config.routeBasePath} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            <Button variant="primary" onClick={() => setFormOpen(true)}>
              <i className="bi bi-pencil me-1" />
              تعديل
            </Button>
          </>
        }
      />

      <Row className="g-3 mb-3">
        <Col xs={12} lg={4}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">بيانات الاتصال</Card.Header>
            <Card.Body>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted">الحالة</span>
                {party.isActive ? (
                  <StatusBadge label="نشط" variant="success" />
                ) : (
                  <StatusBadge label="غير نشط" variant="secondary" />
                )}
              </div>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted">الهاتف</span>
                <span>{party.phone || "—"}</span>
              </div>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted">البريد الإلكتروني</span>
                <span>{party.email || "—"}</span>
              </div>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted">العنوان</span>
                <span className="text-end">{party.address || "—"}</span>
              </div>
              {party.notes && (
                <div className="mt-3 pt-3 border-top">
                  <div className="text-muted small mb-1">ملاحظات</div>
                  <div>{party.notes}</div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={8}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center h-100">
              <div className="text-muted mb-2">{config.balanceLabel}</div>
              <div className={`display-6 fw-bold ${party.balance > 0 ? "text-danger" : "text-success"}`}>
                {formatCurrency(party.balance)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header className="bg-white fw-semibold">كشف الحساب</Card.Header>
        <Card.Body className="p-0">
          {statementResource.loading && <LoadingState />}
          {!statementResource.loading && statementResource.error && (
            <ErrorState message={statementResource.error} onRetry={statementResource.reload} />
          )}
          {!statementResource.loading && statementResource.data && statementResource.data.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-journal-x" title="لا توجد حركات مسجلة بعد" />
            </div>
          )}
          {!statementResource.loading && statementResource.data && statementResource.data.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الحركة</th>
                  <th>البيان</th>
                  <th className="text-end">{config.debitLabel}</th>
                  <th className="text-end">{config.creditLabel}</th>
                  <th className="text-end">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {statementResource.data.map((line, index) => (
                  <tr key={index}>
                    <td>{formatDate(line.date)}</td>
                    <td>
                      <Badge bg="light" text="dark" className="fw-normal">
                        {ledgerSourceTypeLabel(line.sourceType)}
                      </Badge>
                    </td>
                    <td className="text-muted">{line.description}</td>
                    <td className="text-end">{line.debit > 0 ? formatCurrency(line.debit) : "—"}</td>
                    <td className="text-end">{line.credit > 0 ? formatCurrency(line.credit) : "—"}</td>
                    <td className="text-end fw-semibold">{formatCurrency(line.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <PartyFormModal
        show={formOpen}
        config={config}
        party={party}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

export default PartyDetailPage;
