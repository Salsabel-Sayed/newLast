import { useState } from "react";
import { Button, Card, Form, InputGroup, Table } from "react-bootstrap";
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
import type { Category, CategoryConfig } from "./category.types";
import CategoryFormModal from "./CategoryFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

interface CategoryListPageProps {
  config: CategoryConfig;
}

function CategoryListPage({ config }: CategoryListPageProps) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = useConfirm();
  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<Category>>(config.apiBasePath, {
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
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: { name: string; isActive: boolean }) => {
    setSubmitting(true);
    try {
      const payload = { name: values.name.trim(), isActive: values.isActive };
      if (editingCategory) {
        await apiClient.put(`${config.apiBasePath}/${editingCategory._id}`, payload);
        notify(`تم تحديث ${config.singularLabel} بنجاح`, "success");
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

  const handleDelete = async (category: Category) => {
    const confirmed = await confirm({
      title: `حذف ${config.singularLabel}`,
      message: `هل أنت متأكد من حذف "${category.name}"؟ في حال ارتباطها بسجلات أخرى سيتم إلغاء تفعيلها بدلًا من حذفها.`,
      confirmLabel: "حذف",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await apiClient.delete<{ outcome: "deleted" | "disabled" }>(
        `${config.apiBasePath}/${category._id}`
      );
      notify(
        result.outcome === "deleted"
          ? `تم حذف ${config.singularLabel} بنجاح`
          : `تعذر الحذف لوجود بيانات مرتبطة، تم إلغاء تفعيلها بدلًا من ذلك`,
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

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1" style={{ minWidth: 220 }}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="بحث بالاسم..."
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
              <option value="true">النشطة فقط</option>
              <option value="false">غير النشطة</option>
              <option value="all">الكل</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon={config.icon} title={`لا يوجد ${config.pluralLabel}`} description="ابدأ بإضافة سجل جديد" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((category) => (
                  <tr key={category._id}>
                    <td className="fw-semibold">{category.name}</td>
                    <td>
                      {category.isActive ? (
                        <StatusBadge label="نشطة" variant="success" />
                      ) : (
                        <StatusBadge label="غير نشطة" variant="secondary" />
                      )}
                    </td>
                    <td className="text-end">
                      <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => openEditForm(category)}>
                        <i className="bi bi-pencil" />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(category)}>
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

      <CategoryFormModal
        show={formOpen}
        config={config}
        category={editingCategory}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

export default CategoryListPage;
