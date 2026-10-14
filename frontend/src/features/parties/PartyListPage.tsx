import { useState } from "react";
import { Button, Card, Form, InputGroup, Table } from "react-bootstrap";
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
import { formatCurrency } from "../../utils/format";
import type {
  Party,
  PartyBalanceSummary,
  PartyConfig,
  PartyFormValues,
} from "./party.types";
import PartyFormModal from "./PartyFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

interface PartyListResult extends PaginatedResult<Party> {
  summary: PartyBalanceSummary;
}

interface PartyListPageProps {
  config: PartyConfig;
}

function PartyListPage({ config }: PartyListPageProps) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = useConfirm();
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PartyListResult>(config.apiBasePath, {
        search: search || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter,
        page,
        limit: 20,
      }),
    [config.apiBasePath, search, activeFilter, page]
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreateForm = () => {
    setEditingParty(null);
    setFormOpen(true);
  };

  const openEditForm = (party: Party) => {
    setEditingParty(party);
    setFormOpen(true);
  };

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
        openingBalanceAmount: Number(values.openingBalanceAmount || 0),
        openingBalanceSide: values.openingBalanceSide,
        ...(!editingParty ? { openingBalanceDate: values.openingBalanceDate } : {}),
      };

      if (editingParty) {
        await apiClient.put(`${config.apiBasePath}/${editingParty._id}`, payload);
        notify(`تم تحديث بيانات ${config.singularLabel} بنجاح`, "success");
      } else {
        await apiClient.post(config.apiBasePath, payload);
        notify(`تمت إضافة ${config.singularLabel} بنجاح`, "success");
      }

      setFormOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (party: Party) => {
    const confirmed = await confirm({
      title: `حذف ${config.singularLabel}`,
      message: `هل أنت متأكد من حذف "${party.name}"؟ في حال وجود بيانات مرتبطة سيتم إلغاء تفعيله بدلًا من حذفه نهائيًا.`,
      confirmLabel: "حذف",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await apiClient.delete<{ outcome: "deleted" | "disabled" }>(
        `${config.apiBasePath}/${party._id}`
      );
      notify(
        result.outcome === "deleted"
          ? `تم حذف ${config.singularLabel} بنجاح`
          : `تعذر الحذف لوجود بيانات مرتبطة، تم إلغاء تفعيل ${config.singularLabel} بدلًا من ذلك`,
        result.outcome === "deleted" ? "success" : "warning"
      );
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    }
  };

  return (
    <div>
      <PageHeader
        title={config.pluralLabel}
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-1" />
            إضافة {config.singularLabel}
          </Button>
        }
      />

      {!loading && !error && data?.summary && (
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-muted small">{config.positiveBalanceSummaryLabel}</div>
                <div className="fs-5 fw-bold text-success">
                  {formatCurrency(data.summary.positiveBalanceTotal)}
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">{config.negativeBalanceSummaryLabel}</div>
                <div className="fs-5 fw-bold text-danger">
                  {formatCurrency(data.summary.negativeBalanceTotal)}
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">{config.netBalanceSummaryLabel}</div>
                <div className="fs-5 fw-bold">
                  {formatCurrency(data.summary.netBalance)}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1" style={{ minWidth: 220 }}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" />
                </InputGroup.Text>
                <Form.Control
                  placeholder={`بحث بالاسم أو الكود...`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>
            </Form>
            <Form.Select
              style={{ maxWidth: 160 }}
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as "all" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="true">النشطون فقط</option>
              <option value="false">غير النشطين</option>
              <option value="all">الكل</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={config.icon}
                title={`لا يوجد ${config.pluralLabel}`}
                description="ابدأ بإضافة سجل جديد"
              />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th className="text-end">{config.balanceLabel}</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((party) => (
                  <tr key={party._id}>
                    <td className="text-muted">{party.code}</td>
                    <td>
                      <Link to={`${config.routeBasePath}/${party._id}`} className="text-decoration-none fw-semibold">
                        {party.name}
                      </Link>
                    </td>
                    <td>{party.phone || "—"}</td>
                    <td className="text-end">{formatCurrency(party.balance)}</td>
                    <td>
                      {party.isActive ? (
                        <StatusBadge label="نشط" variant="success" />
                      ) : (
                        <StatusBadge label="غير نشط" variant="secondary" />
                      )}
                    </td>
                    <td className="text-end">
                      <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => openEditForm(party)}>
                        <i className="bi bi-pencil" />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(party)}>
                        <i className="bi bi-trash" />
                      </Button>
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

      <PartyFormModal
        show={formOpen}
        config={config}
        party={editingParty}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

export default PartyListPage;
