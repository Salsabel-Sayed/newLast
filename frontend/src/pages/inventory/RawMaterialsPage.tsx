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
import { formatCurrency, formatNumber } from "../../utils/format";
import type { Category } from "../../features/categories/category.types";
import type { Party } from "../../features/parties/party.types";
import type { RawMaterial, RawMaterialFormValues } from "./rawMaterial.types";
import RawMaterialFormModal from "./RawMaterialFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function RawMaterialsPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = useConfirm();
  const { notify } = useToast();

  const { items: categories } = useLookupList<Category>("/raw-material-categories");
  const { items: suppliers } = useLookupList<Party>("/suppliers");
  const categoryNameById = new Map(categories.map((category) => [category._id, category.name]));

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<RawMaterial>>("/raw-materials", {
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

  const openCreateForm = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEditForm = (item: RawMaterial) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: RawMaterialFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        categoryId: values.categoryId || undefined,
        minStockLevel: Number(values.minStockLevel),
        supplierIds: values.supplierIds,
        isActive: values.isActive,
        notes: values.notes.trim(),
      };

      if (editingItem) {
        await apiClient.put(`/raw-materials/${editingItem._id}`, payload);
        notify("تم تحديث المادة الخام بنجاح", "success");
      } else {
        await apiClient.post("/raw-materials", payload);
        notify("تمت إضافة المادة الخام بنجاح", "success");
      }

      setFormOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: RawMaterial) => {
    const confirmed = await confirm({
      title: "حذف مادة خام",
      message: `هل أنت متأكد من حذف "${item.name}"؟ في حال وجود دفعات أو حركات مخزون مرتبطة سيتم إلغاء تفعيلها بدلًا من حذفها.`,
      confirmLabel: "حذف",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await apiClient.delete<{ outcome: "deleted" | "disabled" }>(`/raw-materials/${item._id}`);
      notify(
        result.outcome === "deleted"
          ? "تم حذف المادة الخام بنجاح"
          : "تعذر الحذف لوجود بيانات مرتبطة، تم إلغاء تفعيلها بدلًا من ذلك",
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
        title="المواد الخام"
        description="كتالوج المواد الخام مع الرصيد المُجمَّع ومتوسط التكلفة"
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-1" />
            إضافة مادة خام
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
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
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
              <EmptyState icon="bi-boxes" title="لا يوجد مواد خام" description="ابدأ بإضافة صنف جديد" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الفئة</th>
                  <th className="text-end">المتاح (كجم)</th>
                  <th className="text-end">محجوز (كجم)</th>
                  <th className="text-end">متوسط التكلفة</th>
                  <th className="text-end">قيمة المخزون</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const isLow = item.availableQuantity <= item.minStockLevel;
                  return (
                    <tr key={item._id}>
                      <td className="text-muted">{item.code}</td>
                      <td className="fw-semibold">
                        {item.name}
                        {isLow && (
                          <i
                            className="bi bi-exclamation-triangle-fill text-warning ms-2"
                            title="أقل من حد الطلب الأدنى"
                          />
                        )}
                      </td>
                      <td>{item.categoryId ? (categoryNameById.get(item.categoryId) ?? "—") : "—"}</td>
                      <td className={`text-end ${isLow ? "text-danger fw-semibold" : ""}`}>
                        {formatNumber(item.availableQuantity)}
                      </td>
                      <td className="text-end text-muted">{formatNumber(item.reservedQuantity)}</td>
                      <td className="text-end">{formatCurrency(item.averageCostPerKg)}</td>
                      <td className="text-end">{formatCurrency(item.inventoryValue)}</td>
                      <td>
                        {item.isActive ? (
                          <StatusBadge label="نشط" variant="success" />
                        ) : (
                          <StatusBadge label="غير نشط" variant="secondary" />
                        )}
                      </td>
                      <td className="text-end text-nowrap">
                        <Link
                          to={`/inventory/batches?rawMaterialId=${item._id}`}
                          className="btn btn-outline-secondary btn-sm me-1"
                          title="عرض الدفعات"
                        >
                          <i className="bi bi-layers" />
                        </Link>
                        <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => openEditForm(item)}>
                          <i className="bi bi-pencil" />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item)}>
                          <i className="bi bi-trash" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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

      <RawMaterialFormModal
        show={formOpen}
        item={editingItem}
        categories={categories}
        suppliers={suppliers}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

export default RawMaterialsPage;
