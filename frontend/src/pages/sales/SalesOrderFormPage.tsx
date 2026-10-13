import { useEffect, useState } from "react";
import { Badge, Button, Card, Form, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { estimateFifoCost, type FifoUnit } from "../../utils/fifoEstimate";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import type { RawMaterial } from "../inventory/rawMaterial.types";
import type { Batch } from "../inventory/batch.types";
import type { ReturnedMixBatch } from "../returns/returnedMixBatch.types";
import type { Recipe } from "../recipes/recipe.types";
import {
  DELIVERY_METHOD_LABELS,
  ITEM_TYPE_LABELS,
  type DeliveryMethod,
  type SalesOrder,
  type SalesOrderItemFormRow,
  type SalesOrderItemType,
} from "./salesOrder.types";

type CostEstimate =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "ready"; costPerKg: number; totalCost: number; fullyCovered: boolean };

function batchesToUnits(batches: { remainingQty: number; reservedQty: number; unitCostPerKg: number }[]): FifoUnit[] {
  return batches.map((b) => ({ quantity: b.remainingQty - b.reservedQty, unitCost: b.unitCostPerKg }));
}

function getRowCostEstimate(
  row: SalesOrderItemFormRow,
  batchCache: Record<string, Batch[]>,
  returnedMixCache: Record<string, ReturnedMixBatch[]>
): CostEstimate {
  const qty = Number(row.quantityKg) || 0;
  if (qty <= 0) return { status: "unavailable" };

  if (row.itemType === "raw_material") {
    if (!row.rawMaterialId) return { status: "unavailable" };
    const batches = batchCache[row.rawMaterialId];
    if (!batches) return { status: "loading" };
    const result = estimateFifoCost(batchesToUnits(batches), qty);
    return { status: "ready", costPerKg: result.costPerUnit, totalCost: result.totalCost, fullyCovered: result.fullyCovered };
  }

  if (row.itemType === "recipe") {
    if (row.recipeComponents.length === 0) return { status: "unavailable" };
    let totalCost = 0;
    let fullyCovered = true;
    for (const component of row.recipeComponents) {
      if (!component.rawMaterialId || !(Number(component.gramsPerKg) > 0)) return { status: "unavailable" };
      const batches = batchCache[component.rawMaterialId];
      if (!batches) return { status: "loading" };
      const requiredKg = (Number(component.gramsPerKg) / 1000) * qty;
      const result = estimateFifoCost(batchesToUnits(batches), requiredKg);
      totalCost += result.totalCost;
      if (!result.fullyCovered) fullyCovered = false;
    }
    return { status: "ready", costPerKg: totalCost / qty, totalCost, fullyCovered };
  }

  if (!row.recipeId) return { status: "unavailable" };
  const mixBatches = returnedMixCache[row.recipeId];
  if (!mixBatches) return { status: "loading" };
  const result = estimateFifoCost(batchesToUnits(mixBatches), qty);
  return { status: "ready", costPerKg: result.costPerUnit, totalCost: result.totalCost, fullyCovered: result.fullyCovered };
}

interface RowCostEstimateDisplayProps {
  row: SalesOrderItemFormRow;
  batchCache: Record<string, Batch[]>;
  returnedMixCache: Record<string, ReturnedMixBatch[]>;
}

function RowCostEstimateDisplay({ row, batchCache, returnedMixCache }: RowCostEstimateDisplayProps) {
  const estimate = getRowCostEstimate(row, batchCache, returnedMixCache);

  if (estimate.status === "unavailable") return null;

  if (estimate.status === "loading") {
    return (
      <div className="text-muted small d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        جارٍ حساب التكلفة التقديرية...
      </div>
    );
  }

  const unitPrice = Number(row.unitPrice) || 0;
  const profitPerKg = unitPrice - estimate.costPerKg;
  const hasPrice = row.unitPrice.trim() !== "";

  return (
    <div className="small">
      <div className="d-flex flex-wrap gap-3">
        <span className="text-muted">
          التكلفة التقديرية (FIFO): <span className="fw-semibold text-body">{formatCurrency(estimate.costPerKg)}</span> / كجم — الإجمالي{" "}
          <span className="fw-semibold text-body">{formatCurrency(estimate.totalCost)}</span>
        </span>
        {hasPrice && (
          <span className={profitPerKg >= 0 ? "text-success" : "text-danger"}>
            هامش الربح لكل كجم: <span className="fw-semibold">{formatCurrency(profitPerKg)}</span>
          </span>
        )}
      </div>
      {!estimate.fullyCovered && (
        <div className="text-warning-emphasis mt-1">
          <i className="bi bi-exclamation-triangle-fill me-1" />
          المخزون المتاح حاليًا أقل من الكمية المطلوبة، التكلفة تقديرية جزئية فقط
        </div>
      )}
    </div>
  );
}

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
const GRAMS_PER_KG_TOTAL = 1000;
const GRAMS_EPSILON = 0.01;

let rowKeySeed = 0;
function nextRowKey(prefix: string): string {
  rowKeySeed += 1;
  return `${prefix}-${rowKeySeed}`;
}

function emptyRow(): SalesOrderItemFormRow {
  return {
    key: nextRowKey("item"),
    itemType: "raw_material",
    rawMaterialId: "",
    recipeId: "",
    recipeComponents: [],
    quantityKg: "",
    unitPrice: "",
    discountMode: "none",
    discountValue: "",
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowLineSubtotal(row: SalesOrderItemFormRow): number {
  return (Number(row.quantityKg) || 0) * (Number(row.unitPrice) || 0);
}

function rowDiscountAmount(row: SalesOrderItemFormRow): number {
  const subtotal = rowLineSubtotal(row);
  const value = Number(row.discountValue) || 0;
  if (row.discountMode === "percent") return subtotal * (value / 100);
  if (row.discountMode === "amount") return value;
  return 0;
}

function rowLineTotal(row: SalesOrderItemFormRow): number {
  return rowLineSubtotal(row) - rowDiscountAmount(row);
}

function rowComponentsTotal(row: SalesOrderItemFormRow): number {
  return row.recipeComponents.reduce((sum, c) => sum + (Number(c.gramsPerKg) || 0), 0);
}

function SalesOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { notify } = useToast();

  const { items: customers } = useLookupList<Party>("/customers");
  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials");
  const { items: recipes } = useLookupList<Recipe>("/recipes");

  const orderResource = useApiResource(
    () => (isEdit ? apiClient.get<SalesOrder>(`/sales-orders/${id}`) : Promise.resolve(null)),
    [id]
  );

  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(todayIsoDate());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<SalesOrderItemFormRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!isEdit);
  const [batchCache, setBatchCache] = useState<Record<string, Batch[]>>({});
  const [returnedMixCache, setReturnedMixCache] = useState<Record<string, ReturnedMixBatch[]>>({});

  useEffect(() => {
    const neededMaterialIds = new Set<string>();
    const neededRecipeIds = new Set<string>();
    for (const row of rows) {
      if (row.itemType === "raw_material" && row.rawMaterialId) neededMaterialIds.add(row.rawMaterialId);
      if (row.itemType === "recipe") {
        for (const component of row.recipeComponents) {
          if (component.rawMaterialId) neededMaterialIds.add(component.rawMaterialId);
        }
      }
      if (row.itemType === "returned_mix" && row.recipeId) neededRecipeIds.add(row.recipeId);
    }

    const missingMaterialIds = [...neededMaterialIds].filter((id) => !(id in batchCache));
    const missingRecipeIds = [...neededRecipeIds].filter((id) => !(id in returnedMixCache));
    if (missingMaterialIds.length === 0 && missingRecipeIds.length === 0) return;

    let cancelled = false;

    Promise.all([
      ...missingMaterialIds.map((rawMaterialId) =>
        apiClient
          .get<PaginatedResult<Batch>>("/batches", { rawMaterialId, status: "active", limit: 100 })
          .then((result) => ({ kind: "material" as const, id: rawMaterialId, items: result.items }))
      ),
      ...missingRecipeIds.map((recipeId) =>
        apiClient
          .get<PaginatedResult<ReturnedMixBatch>>("/returned-mixes", { recipeId, status: "active", limit: 100 })
          .then((result) => ({ kind: "recipe" as const, id: recipeId, items: result.items }))
      ),
    ]).then((results) => {
      if (cancelled) return;
      const materialEntries = results.filter((r) => r.kind === "material");
      const recipeEntries = results.filter((r) => r.kind === "recipe");
      if (materialEntries.length > 0) {
        setBatchCache((current) => {
          const next = { ...current };
          for (const entry of materialEntries) next[entry.id] = entry.items as Batch[];
          return next;
        });
      }
      if (recipeEntries.length > 0) {
        setReturnedMixCache((current) => {
          const next = { ...current };
          for (const entry of recipeEntries) next[entry.id] = entry.items as ReturnedMixBatch[];
          return next;
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rows, batchCache, returnedMixCache]);

  useEffect(() => {
    if (isEdit && orderResource.data && !initialized) {
      const order = orderResource.data;
      if (order.status !== "draft") {
        notify("لا يمكن تعديل أمر بيع بعد تأكيده أو إلغائه", "warning");
        navigate(`/sales/orders/${order._id}`);
        return;
      }
      setCustomerId(order.customerId);
      setOrderDate(order.orderDate.slice(0, 10));
      setExpectedDeliveryDate(order.expectedDeliveryDate ? order.expectedDeliveryDate.slice(0, 10) : "");
      setDeliveryMethod(order.deliveryMethod);
      setNotes(order.notes ?? "");
      setRows(
        order.items.map((item) => ({
          key: nextRowKey("item"),
          itemType: item.itemType,
          rawMaterialId: item.rawMaterialId ?? "",
          recipeId: item.recipeId ?? "",
          recipeComponents: item.recipeComponents.map((c) => ({
            rawMaterialId: c.rawMaterialId,
            gramsPerKg: String(c.gramsPerKg),
          })),
          quantityKg: String(item.quantityKg),
          unitPrice: String(item.unitPrice),
          discountMode: item.discountPercent !== undefined ? "percent" : item.discountAmount > 0 ? "amount" : "none",
          discountValue:
            item.discountPercent !== undefined
              ? String(item.discountPercent)
              : item.discountAmount > 0
                ? String(item.discountAmount)
                : "",
        }))
      );
      setInitialized(true);
    }
  }, [isEdit, orderResource.data, initialized, navigate, notify]);

  const updateRow = (key: string, patch: Partial<SalesOrderItemFormRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const changeItemType = (key: string, itemType: SalesOrderItemType) => {
    updateRow(key, { itemType, rawMaterialId: "", recipeId: "", recipeComponents: [] });
  };

  const changeRecipeForRow = (key: string, recipeId: string) => {
    const recipe = recipes.find((r) => r._id === recipeId);
    updateRow(key, {
      recipeId,
      recipeComponents: recipe
        ? recipe.components.map((c) => ({ rawMaterialId: c.rawMaterialId, gramsPerKg: String(c.gramsPerKg) }))
        : [],
    });
  };

  const addComponentRow = (rowKey: string) => {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey ? { ...row, recipeComponents: [...row.recipeComponents, { rawMaterialId: "", gramsPerKg: "" }] } : row
      )
    );
  };

  const updateComponentRow = (rowKey: string, index: number, patch: Partial<{ rawMaterialId: string; gramsPerKg: string }>) => {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              recipeComponents: row.recipeComponents.map((c, i) => (i === index ? { ...c, ...patch } : c)),
            }
          : row
      )
    );
  };

  const removeComponentRow = (rowKey: string, index: number) => {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey ? { ...row, recipeComponents: row.recipeComponents.filter((_, i) => i !== index) } : row
      )
    );
  };

  const grandSubtotal = rows.reduce((sum, row) => sum + rowLineSubtotal(row), 0);
  const grandDiscount = rows.reduce((sum, row) => sum + rowDiscountAmount(row), 0);
  const grandTotal = grandSubtotal - grandDiscount;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError("يجب اختيار العميل");
      return;
    }
    if (!orderDate) {
      setFormError("تاريخ الأمر مطلوب");
      return;
    }

    for (const row of rows) {
      if (row.itemType === "raw_material" && !row.rawMaterialId) {
        setFormError("يجب اختيار مادة خام لكل سطر من نوع مادة خام");
        return;
      }
      if ((row.itemType === "recipe" || row.itemType === "returned_mix") && !row.recipeId) {
        setFormError("يجب اختيار توليفة لكل سطر من نوع توليفة");
        return;
      }
      if (!(Number(row.quantityKg) > 0)) {
        setFormError("الكمية يجب أن تكون أكبر من صفر لجميع الأسطر");
        return;
      }
      if (!(Number(row.unitPrice) >= 0)) {
        setFormError("سعر الوحدة غير صحيح");
        return;
      }
      if (row.itemType === "recipe") {
        if (row.recipeComponents.length === 0) {
          setFormError("يجب أن تحتوي التوليفة على مكوّن واحد على الأقل");
          return;
        }
        for (const component of row.recipeComponents) {
          if (!component.rawMaterialId || !(Number(component.gramsPerKg) > 0)) {
            setFormError("بيانات مكونات التوليفة غير مكتملة");
            return;
          }
        }
        const ids = row.recipeComponents.map((c) => c.rawMaterialId);
        if (new Set(ids).size !== ids.length) {
          setFormError("لا يجوز تكرار نفس المادة الخام داخل مكونات نفس التوليفة");
          return;
        }
        if (Math.abs(rowComponentsTotal(row) - GRAMS_PER_KG_TOTAL) > GRAMS_EPSILON) {
          setFormError(
            `مجموع مكونات إحدى التوليفات يجب أن يساوي 1000 جرام بالضبط (المجموع الحالي: ${formatNumber(rowComponentsTotal(row))})`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId,
        orderDate: new Date(orderDate).toISOString(),
        ...(expectedDeliveryDate ? { expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString() } : {}),
        deliveryMethod,
        notes: notes.trim(),
        items: rows.map((row) => ({
          itemType: row.itemType,
          ...(row.itemType === "raw_material" ? { rawMaterialId: row.rawMaterialId } : {}),
          ...(row.itemType === "recipe" || row.itemType === "returned_mix" ? { recipeId: row.recipeId } : {}),
          ...(row.itemType === "recipe"
            ? {
                recipeComponents: row.recipeComponents.map((c) => ({
                  rawMaterialId: c.rawMaterialId,
                  gramsPerKg: Number(c.gramsPerKg),
                })),
              }
            : {}),
          quantityKg: Number(row.quantityKg),
          unitPrice: Number(row.unitPrice),
          ...(row.discountMode === "percent" ? { discountPercent: Number(row.discountValue) || 0 } : {}),
          ...(row.discountMode === "amount" ? { discountAmount: Number(row.discountValue) || 0 } : {}),
        })),
      };

      if (isEdit) {
        await apiClient.put(`/sales-orders/${id}`, payload);
        notify("تم تحديث أمر البيع بنجاح", "success");
        navigate(`/sales/orders/${id}`);
      } else {
        const created = await apiClient.post<{ _id: string }>("/sales-orders", payload);
        notify("تم إنشاء أمر البيع بنجاح", "success");
        navigate(`/sales/orders/${created._id}`);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && orderResource.loading) return <LoadingState />;
  if (isEdit && orderResource.error) return <ErrorState message={orderResource.error} onRetry={orderResource.reload} />;

  return (
    <div>
      <PageHeader title={isEdit ? "تعديل أمر البيع" : "أمر بيع جديد"} />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>العميل *</Form.Label>
                  <Form.Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">اختر...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>تاريخ الأمر *</Form.Label>
                  <Form.Control type="date" dir="ltr" lang="en-GB" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>تاريخ التسليم المتوقع</Form.Label>
                  <Form.Control
                    type="date" dir="ltr" lang="en-GB"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </Form.Group>
              </div>
              <div className="col-md-2">
                <Form.Group>
                  <Form.Label>طريقة التسليم *</Form.Label>
                  <Form.Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}>
                    {Object.entries(DELIVERY_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>ملاحظات</Form.Label>
                  <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold">أصناف الأمر</span>
          <Button variant="outline-primary" size="sm" onClick={addRow} type="button">
            <i className="bi bi-plus-lg me-1" />
            إضافة صنف
          </Button>
        </div>

        {rows.map((row, rowIndex) => (
          <Card key={row.key} className="mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">صنف {rowIndex + 1}</span>
                <Form.Select
                  style={{ width: 220 }}
                  size="sm"
                  value={row.itemType}
                  onChange={(e) => changeItemType(row.key, e.target.value as SalesOrderItemType)}
                >
                  {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <Button variant="outline-danger" size="sm" onClick={() => removeRow(row.key)} type="button">
                <i className="bi bi-trash" />
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="row g-3">
                {row.itemType === "raw_material" && (
                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>المادة الخام *</Form.Label>
                      <Form.Select value={row.rawMaterialId} onChange={(e) => updateRow(row.key, { rawMaterialId: e.target.value })}>
                        <option value="">اختر...</option>
                        {rawMaterials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                )}
                {(row.itemType === "recipe" || row.itemType === "returned_mix") && (
                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>التوليفة *</Form.Label>
                      <Form.Select value={row.recipeId} onChange={(e) => changeRecipeForRow(row.key, e.target.value)}>
                        <option value="">اختر...</option>
                        {recipes.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                )}
                <div className="col-md-2">
                  <Form.Group>
                    <Form.Label>الكمية (كجم) *</Form.Label>
                    <Form.Control
                      type="number" dir="ltr" lang="en-US"
                      min={0}
                      step="any"
                      value={row.quantityKg}
                      onChange={(e) => updateRow(row.key, { quantityKg: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-2">
                  <Form.Group>
                    <Form.Label>سعر الوحدة *</Form.Label>
                    <Form.Control
                      type="number" dir="ltr" lang="en-US"
                      min={0}
                      step="any"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-2">
                  <Form.Group>
                    <Form.Label>نوع الخصم</Form.Label>
                    <Form.Select
                      value={row.discountMode}
                      onChange={(e) =>
                        updateRow(row.key, { discountMode: e.target.value as SalesOrderItemFormRow["discountMode"], discountValue: "" })
                      }
                    >
                      <option value="none">بدون خصم</option>
                      <option value="percent">نسبة %</option>
                      <option value="amount">قيمة</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-2">
                  <Form.Group>
                    <Form.Label>قيمة الخصم</Form.Label>
                    <Form.Control
                      type="number" dir="ltr" lang="en-US"
                      min={0}
                      step="any"
                      disabled={row.discountMode === "none"}
                      value={row.discountValue}
                      onChange={(e) => updateRow(row.key, { discountValue: e.target.value })}
                    />
                  </Form.Group>
                </div>
              </div>

              {row.itemType === "recipe" && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-semibold">مكونات هذه التوليفة (لكل 1 كجم)</span>
                    <Button variant="outline-secondary" size="sm" onClick={() => addComponentRow(row.key)} type="button">
                      <i className="bi bi-plus-lg me-1" />
                      إضافة مكوّن
                    </Button>
                  </div>
                  {row.recipeComponents.map((component, componentIndex) => (
                    <div className="row g-2 mb-2 align-items-center" key={componentIndex}>
                      <div className="col-6">
                        <Form.Select
                          size="sm"
                          value={component.rawMaterialId}
                          onChange={(e) => updateComponentRow(row.key, componentIndex, { rawMaterialId: e.target.value })}
                        >
                          <option value="">اختر مادة خام...</option>
                          {rawMaterials.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name}
                            </option>
                          ))}
                        </Form.Select>
                      </div>
                      <div className="col-4">
                        <Form.Control
                          size="sm"
                          type="number" dir="ltr" lang="en-US"
                          min={0}
                          step="any"
                          placeholder="جرام"
                          value={component.gramsPerKg}
                          onChange={(e) => updateComponentRow(row.key, componentIndex, { gramsPerKg: e.target.value })}
                        />
                      </div>
                      <div className="col-2">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeComponentRow(row.key, componentIndex)}
                          type="button"
                        >
                          <i className="bi bi-trash" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div
                    className={`small fw-semibold ${
                      Math.abs(rowComponentsTotal(row) - GRAMS_PER_KG_TOTAL) <= GRAMS_EPSILON ? "text-success" : "text-danger"
                    }`}
                  >
                    الإجمالي: {formatNumber(rowComponentsTotal(row))} / 1000 جم
                  </div>
                </div>
              )}

              <div className="mt-3 pt-2 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                <RowCostEstimateDisplay row={row} batchCache={batchCache} returnedMixCache={returnedMixCache} />
                <Badge bg="light" text="dark" className="fw-normal fs-6">
                  إجمالي السطر: {formatCurrency(rowLineTotal(row))}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        ))}

        <Card>
          <Card.Body>
            {formError && <div className="text-danger small mb-2">{formError}</div>}
            <div className="d-flex justify-content-end">
              <div style={{ minWidth: 260 }}>
                <div className="d-flex justify-content-between text-muted small">
                  <span>الإجمالي الفرعي</span>
                  <span>{formatCurrency(grandSubtotal)}</span>
                </div>
                <div className="d-flex justify-content-between text-muted small">
                  <span>إجمالي الخصم</span>
                  <span>{formatCurrency(grandDiscount)}</span>
                </div>
                <div className="d-flex justify-content-between fw-bold fs-5 mt-1">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/sales/orders")} type="button">
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

export default SalesOrderFormPage;
