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
import { useLookupList } from "../../hooks/useLookupList";
import type { Category } from "../../features/categories/category.types";
import type { Recipe } from "./recipe.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function RecipesPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [page, setPage] = useState(1);

  const confirm = useConfirm();
  const { notify } = useToast();
  const { items: categories } = useLookupList<Category>("/recipe-categories");
  const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<Recipe>>("/recipes", {
        search: search || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter,
        categoryId: categoryFilter || undefined,
        page,
        limit: 20,
      }),
    [search, activeFilter, categoryFilter, page]
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleDelete = async (recipe: Recipe) => {
    const confirmed = await confirm({
      title: "حذف وصفة",
      message: `هل أنت متأكد من حذف "${recipe.name}"؟ في حال ارتباطها بأوامر بيع سيتم إلغاء تفعيلها بدلًا من حذفها.`,
      confirmLabel: "حذف",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await apiClient.delete<{ outcome: "deleted" | "disabled" }>(`/recipes/${recipe._id}`);
      notify(
        result.outcome === "deleted" ? "تم حذف الوصفة بنجاح" : "تعذر الحذف لوجود بيانات مرتبطة، تم إلغاء تفعيلها بدلًا من ذلك",
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
        title="الوصفات"
        description="تعريف الوصفات ومكوناتها، بلا سعر بيع وبلا أثر مخزني مباشر"
        actions={
          <Link to="/recipes/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            إضافة وصفة
          </Link>
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
                  placeholder="بحث بالاسم أو الكود..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>
            </Form>
            <Form.Select
              style={{ maxWidth: 200 }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الفئات</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
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
              <EmptyState icon="bi-journal-text" title="لا توجد وصفات" description="ابدأ بإضافة وصفة جديدة" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الفئة</th>
                  <th className="text-end">عدد المكونات</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((recipe) => (
                  <tr key={recipe._id}>
                    <td className="text-muted">{recipe.code}</td>
                    <td>
                      <Link to={`/recipes/${recipe._id}`} className="text-decoration-none fw-semibold">
                        {recipe.name}
                      </Link>
                    </td>
                    <td>{recipe.categoryId ? (categoryNameById.get(recipe.categoryId) ?? "—") : "—"}</td>
                    <td className="text-end">{recipe.components.length}</td>
                    <td>
                      {recipe.isActive ? (
                        <StatusBadge label="نشطة" variant="success" />
                      ) : (
                        <StatusBadge label="غير نشطة" variant="secondary" />
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <Link to={`/recipes/${recipe._id}/edit`} className="btn btn-outline-secondary btn-sm me-1">
                        <i className="bi bi-pencil" />
                      </Link>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(recipe)}>
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
    </div>
  );
}

export default RecipesPage;
