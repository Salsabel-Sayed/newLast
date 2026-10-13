import { useEffect, useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatNumber } from "../../utils/format";
import type { Category } from "../../features/categories/category.types";
import type { RawMaterial } from "../inventory/rawMaterial.types";
import type { Recipe, RecipeComponentFormRow } from "./recipe.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
const GRAMS_PER_KG_TOTAL = 1000;
const GRAMS_EPSILON = 0.01;

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `component-${rowKeySeed}`;
}

function emptyRow(): RecipeComponentFormRow {
  return { key: nextRowKey(), rawMaterialId: "", gramsPerKg: "" };
}

function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { notify } = useToast();

  const { items: categories } = useLookupList<Category>("/recipe-categories");
  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials");

  const recipeResource = useApiResource(
    () => (isEdit ? apiClient.get<Recipe>(`/recipes/${id}`) : Promise.resolve(null)),
    [id]
  );

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<RecipeComponentFormRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!isEdit);

  useEffect(() => {
    if (isEdit && recipeResource.data && !initialized) {
      const recipe = recipeResource.data;
      setCode(recipe.code);
      setName(recipe.name);
      setCategoryId(recipe.categoryId ?? "");
      setNotes(recipe.notes ?? "");
      setIsActive(recipe.isActive);
      setRows(
        recipe.components.map((component) => ({
          key: nextRowKey(),
          rawMaterialId: component.rawMaterialId,
          gramsPerKg: String(component.gramsPerKg),
        }))
      );
      setInitialized(true);
    }
  }, [isEdit, recipeResource.data, initialized]);

  const updateRow = (key: string, patch: Partial<RecipeComponentFormRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const totalGrams = rows.reduce((sum, row) => sum + (Number(row.gramsPerKg) || 0), 0);
  const totalIsValid = Math.abs(totalGrams - GRAMS_PER_KG_TOTAL) <= GRAMS_EPSILON;

  const selectedMaterialIds = new Set(rows.map((row) => row.rawMaterialId).filter(Boolean));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!code.trim()) {
      setFormError("كود الوصفة مطلوب");
      return;
    }
    if (!name.trim()) {
      setFormError("اسم الوصفة مطلوب");
      return;
    }
    for (const row of rows) {
      if (!row.rawMaterialId) {
        setFormError("يجب اختيار مادة خام لكل مكوّن");
        return;
      }
      if (!(Number(row.gramsPerKg) > 0)) {
        setFormError("يجب أن تكون كمية كل مكوّن بالجرام أكبر من صفر");
        return;
      }
    }
    const materialIds = rows.map((row) => row.rawMaterialId);
    if (new Set(materialIds).size !== materialIds.length) {
      setFormError("لا يجوز تكرار نفس المادة الخام أكثر من مرة داخل نفس الوصفة");
      return;
    }
    if (!totalIsValid) {
      setFormError(`مجموع مكونات الوصفة يجب أن يساوي 1000 جرام بالضبط (المجموع الحالي: ${formatNumber(totalGrams)})`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        categoryId: categoryId || undefined,
        components: rows.map((row) => ({
          rawMaterialId: row.rawMaterialId,
          gramsPerKg: Number(row.gramsPerKg),
        })),
        isActive,
        notes: notes.trim(),
      };

      if (isEdit) {
        await apiClient.put(`/recipes/${id}`, payload);
        notify("تم تحديث الوصفة بنجاح", "success");
        navigate(`/recipes/${id}`);
      } else {
        const created = await apiClient.post<{ _id: string }>("/recipes", payload);
        notify("تمت إضافة الوصفة بنجاح", "success");
        navigate(`/recipes/${created._id}`);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && recipeResource.loading) return <LoadingState />;
  if (isEdit && recipeResource.error) {
    return <ErrorState message={recipeResource.error} onRetry={recipeResource.reload} />;
  }

  return (
    <div>
      <PageHeader title={isEdit ? "تعديل الوصفة" : "إضافة وصفة جديدة"} />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>الكود *</Form.Label>
                  <Form.Control value={code} onChange={(e) => setCode(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>الاسم *</Form.Label>
                  <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>الفئة</Form.Label>
                  <Form.Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">بدون فئة</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="recipe-active-switch"
                  label="نشطة"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>ملاحظات</Form.Label>
                  <Form.Control as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">المكونات (لكل 1 كجم من التوليفة)</span>
            <Button variant="outline-primary" size="sm" onClick={addRow} type="button">
              <i className="bi bi-plus-lg me-1" />
              إضافة مكوّن
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>المادة الخام *</th>
                  <th style={{ minWidth: 140 }}>الكمية (جرام) *</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <Form.Select
                        value={row.rawMaterialId}
                        onChange={(e) => updateRow(row.key, { rawMaterialId: e.target.value })}
                      >
                        <option value="">اختر...</option>
                        {rawMaterials
                          .filter((m) => m._id === row.rawMaterialId || !selectedMaterialIds.has(m._id))
                          .map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name}
                            </option>
                          ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control
                        type="number" dir="ltr" lang="en-US"
                        min={0}
                        step="any"
                        value={row.gramsPerKg}
                        onChange={(e) => updateRow(row.key, { gramsPerKg: e.target.value })}
                      />
                    </td>
                    <td>
                      <Button variant="outline-danger" size="sm" onClick={() => removeRow(row.key)} type="button">
                        <i className="bi bi-trash" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
          <Card.Footer className="bg-white d-flex justify-content-between align-items-center">
            <div>{formError && <span className="text-danger small">{formError}</span>}</div>
            <div className={`fw-bold ${totalIsValid ? "text-success" : "text-danger"}`}>
              الإجمالي: {formatNumber(totalGrams)} / 1000 جم
            </div>
          </Card.Footer>
        </Card>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/recipes")} type="button">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default RecipeFormPage;
