import { useEffect, useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../components/common/ToastProvider";
import { useLookupList } from "../../hooks/useLookupList";
import { formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import type { SalesOrder } from "../sales/salesOrder.types";
import type { PurchaseOrder } from "../purchases/purchaseOrder.types";
import { DISPOSITION_LABELS, RETURN_TYPE_LABELS, RETURN_TYPES, type ReturnDisposition, type ReturnType } from "./return.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `ret-row-${rowKeySeed}`;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface RawMaterialRow {
  key: string;
  rawMaterialId: string;
  quantityKg: string;
}

interface RecipeRow {
  key: string;
  recipeId: string;
  disposition: ReturnDisposition;
  quantityKg: string;
}

interface BatchRow {
  key: string;
  batchId: string;
  quantityKg: string;
}

function NewReturnPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  const [returnType, setReturnType] = useState<ReturnType>(() => {
    const fromQuery = searchParams.get("returnType");
    return fromQuery && RETURN_TYPES.includes(fromQuery as ReturnType) ? (fromQuery as ReturnType) : "sales_raw_material";
  });
  const [returnDate, setReturnDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sales returns (raw material / recipe)
  const { items: customers } = useLookupList<Party>("/customers", true);
  const [customerId, setCustomerId] = useState(() => searchParams.get("customerId") ?? "");
  const [customerOrders, setCustomerOrders] = useState<SalesOrder[]>([]);
  const [salesOrderId, setSalesOrderId] = useState(() => searchParams.get("salesOrderId") ?? "");
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [rawMaterialRows, setRawMaterialRows] = useState<RawMaterialRow[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);

  // Purchase returns
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);
  const [supplierId, setSupplierId] = useState(() => searchParams.get("supplierId") ?? "");
  const [supplierOrders, setSupplierOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState(() => searchParams.get("purchaseOrderId") ?? "");
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // Explicit, user-driven reset only — never triggered by the initial query-param prefill above.
  const handleReturnTypeChange = (next: ReturnType) => {
    const prevIsSales = returnType !== "purchase_return";
    const nextIsSales = next !== "purchase_return";
    if (prevIsSales !== nextIsSales) {
      setCustomerId("");
      setCustomerOrders([]);
      setSalesOrderId("");
      setSalesOrder(null);
      setSupplierId("");
      setSupplierOrders([]);
      setPurchaseOrderId("");
      setPurchaseOrder(null);
    }
    setRawMaterialRows([]);
    setRecipeRows([]);
    setBatchRows([]);
    setFormError(null);
    setReturnType(next);
  };

  useEffect(() => {
    if (!customerId) {
      setCustomerOrders([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get<PaginatedResult<SalesOrder>>("/sales-orders", { customerId, status: "delivered", limit: 100 })
      .then((result) => {
        if (!cancelled) setCustomerOrders(result.items);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (!salesOrderId) {
      setSalesOrder(null);
      setRawMaterialRows([]);
      setRecipeRows([]);
      return;
    }
    let cancelled = false;
    apiClient.get<SalesOrder>(`/sales-orders/${salesOrderId}`).then((order) => {
      if (cancelled) return;
      setSalesOrder(order);
      setRawMaterialRows([]);
      setRecipeRows([]);
    });
    return () => {
      cancelled = true;
    };
  }, [salesOrderId]);

  useEffect(() => {
    if (!supplierId) {
      setSupplierOrders([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get<PaginatedResult<PurchaseOrder>>("/purchase-orders", { supplierId, status: "received", limit: 100 })
      .then((result) => {
        if (!cancelled) setSupplierOrders(result.items);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  useEffect(() => {
    if (!purchaseOrderId) {
      setPurchaseOrder(null);
      setBatchRows([]);
      return;
    }
    let cancelled = false;
    apiClient.get<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}`).then((order) => {
      if (cancelled) return;
      setPurchaseOrder(order);
      setBatchRows([]);
    });
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId]);

  const availableRawMaterialItems = (salesOrder?.items ?? []).filter((item) => item.itemType === "raw_material");
  const availableRecipeItems = (salesOrder?.items ?? []).filter((item) => item.itemType === "recipe");

  const addRawMaterialRow = () =>
    setRawMaterialRows((current) => [...current, { key: nextRowKey(), rawMaterialId: "", quantityKg: "" }]);
  const addRecipeRow = () =>
    setRecipeRows((current) => [...current, { key: nextRowKey(), recipeId: "", disposition: "return_to_stock", quantityKg: "" }]);
  const addBatchRow = () => setBatchRows((current) => [...current, { key: nextRowKey(), batchId: "", quantityKg: "" }]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!returnDate) {
      setFormError("تاريخ المرتجع مطلوب");
      return;
    }

    let payload: Record<string, unknown> | null = null;

    if (returnType === "sales_raw_material") {
      if (!customerId || !salesOrderId) {
        setFormError("يجب اختيار العميل وأمر البيع");
        return;
      }
      if (rawMaterialRows.length === 0) {
        setFormError("يجب إضافة سطر واحد على الأقل");
        return;
      }
      for (const row of rawMaterialRows) {
        if (!row.rawMaterialId || !(Number(row.quantityKg) > 0)) {
          setFormError("بيانات أسطر المرتجع غير مكتملة");
          return;
        }
      }
      payload = {
        returnType,
        returnDate: new Date(returnDate).toISOString(),
        customerId,
        salesOrderId,
        notes: notes.trim(),
        items: rawMaterialRows.map((row) => ({ rawMaterialId: row.rawMaterialId, quantityKg: Number(row.quantityKg) })),
      };
    } else if (returnType === "sales_recipe") {
      if (!customerId || !salesOrderId) {
        setFormError("يجب اختيار العميل وأمر البيع");
        return;
      }
      if (recipeRows.length === 0) {
        setFormError("يجب إضافة سطر واحد على الأقل");
        return;
      }
      for (const row of recipeRows) {
        if (!row.recipeId || !(Number(row.quantityKg) > 0)) {
          setFormError("بيانات أسطر المرتجع غير مكتملة");
          return;
        }
      }
      payload = {
        returnType,
        returnDate: new Date(returnDate).toISOString(),
        customerId,
        salesOrderId,
        notes: notes.trim(),
        items: recipeRows.map((row) => ({
          recipeId: row.recipeId,
          disposition: row.disposition,
          quantityKg: Number(row.quantityKg),
        })),
      };
    } else {
      if (!supplierId || !purchaseOrderId) {
        setFormError("يجب اختيار المورد وأمر الشراء");
        return;
      }
      if (batchRows.length === 0) {
        setFormError("يجب إضافة سطر واحد على الأقل");
        return;
      }
      for (const row of batchRows) {
        if (!row.batchId || !(Number(row.quantityKg) > 0)) {
          setFormError("بيانات أسطر المرتجع غير مكتملة");
          return;
        }
      }
      payload = {
        returnType,
        returnDate: new Date(returnDate).toISOString(),
        supplierId,
        purchaseOrderId,
        notes: notes.trim(),
        items: batchRows.map((row) => ({ batchId: row.batchId, quantityKg: Number(row.quantityKg) })),
      };
    }

    setSubmitting(true);
    try {
      const created = await apiClient.post<{ _id: string }>("/returns", payload);
      notify("تم تسجيل المرتجع بنجاح", "success");
      navigate(`/returns/${created._id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="مرتجع جديد" />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>نوع المرتجع *</Form.Label>
                  <Form.Select value={returnType} onChange={(e) => handleReturnTypeChange(e.target.value as ReturnType)}>
                    {Object.entries(RETURN_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>تاريخ المرتجع *</Form.Label>
                  <Form.Control type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-5">
                <Form.Group>
                  <Form.Label>ملاحظات</Form.Label>
                  <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
              </div>
            </div>
          </Card.Body>
        </Card>

        {(returnType === "sales_raw_material" || returnType === "sales_recipe") && (
          <Card className="mb-3">
            <Card.Body>
              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>العميل *</Form.Label>
                    <Form.Select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        setSalesOrderId("");
                      }}
                    >
                      <option value="">اختر...</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>أمر البيع (المُسلَّم) *</Form.Label>
                    <Form.Select value={salesOrderId} disabled={!customerId} onChange={(e) => setSalesOrderId(e.target.value)}>
                      <option value="">اختر...</option>
                      {customerOrders.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.orderNumber}
                        </option>
                      ))}
                    </Form.Select>
                    {customerId && customerOrders.length === 0 && (
                      <Form.Text className="text-muted">لا توجد أوامر بيع مُسلَّمة لهذا العميل</Form.Text>
                    )}
                  </Form.Group>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {returnType === "sales_raw_material" && salesOrder && (
          <Card className="mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">أصناف المرتجع</span>
              <Button variant="outline-primary" size="sm" onClick={addRawMaterialRow} type="button">
                <i className="bi bi-plus-lg me-1" />
                إضافة سطر
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>المادة الخام *</th>
                    <th style={{ minWidth: 140 }}>الكمية المرتجعة (كجم) *</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterialRows.map((row) => {
                    const originalItem = availableRawMaterialItems.find((i) => i.rawMaterialId === row.rawMaterialId);
                    return (
                      <tr key={row.key}>
                        <td>
                          <Form.Select
                            value={row.rawMaterialId}
                            onChange={(e) =>
                              setRawMaterialRows((current) =>
                                current.map((r) => (r.key === row.key ? { ...r, rawMaterialId: e.target.value } : r))
                              )
                            }
                          >
                            <option value="">اختر...</option>
                            {availableRawMaterialItems.map((item) => (
                              <option key={item.rawMaterialId} value={item.rawMaterialId}>
                                {item.rawMaterialName}
                              </option>
                            ))}
                          </Form.Select>
                          {originalItem && (
                            <Form.Text className="text-muted">
                              الكمية المباعة أصلًا: {formatNumber(originalItem.quantityKg)} كجم
                            </Form.Text>
                          )}
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={row.quantityKg}
                            onChange={(e) =>
                              setRawMaterialRows((current) =>
                                current.map((r) => (r.key === row.key ? { ...r, quantityKg: e.target.value } : r))
                              )
                            }
                          />
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => setRawMaterialRows((current) => current.filter((r) => r.key !== row.key))}
                          >
                            <i className="bi bi-trash" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {returnType === "sales_recipe" && salesOrder && (
          <Card className="mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">أصناف المرتجع</span>
              <Button variant="outline-primary" size="sm" onClick={addRecipeRow} type="button">
                <i className="bi bi-plus-lg me-1" />
                إضافة سطر
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>التوليفة *</th>
                    <th style={{ minWidth: 140 }}>الكمية المرتجعة (كجم) *</th>
                    <th style={{ minWidth: 260 }}>طريقة التعامل *</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recipeRows.map((row) => {
                    const originalItem = availableRecipeItems.find((i) => i.recipeId === row.recipeId);
                    return (
                      <tr key={row.key}>
                        <td>
                          <Form.Select
                            value={row.recipeId}
                            onChange={(e) =>
                              setRecipeRows((current) => current.map((r) => (r.key === row.key ? { ...r, recipeId: e.target.value } : r)))
                            }
                          >
                            <option value="">اختر...</option>
                            {availableRecipeItems.map((item) => (
                              <option key={item.recipeId} value={item.recipeId}>
                                {item.recipeName}
                              </option>
                            ))}
                          </Form.Select>
                          {originalItem && (
                            <Form.Text className="text-muted">
                              الكمية المباعة أصلًا: {formatNumber(originalItem.quantityKg)} كجم
                            </Form.Text>
                          )}
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={row.quantityKg}
                            onChange={(e) =>
                              setRecipeRows((current) => current.map((r) => (r.key === row.key ? { ...r, quantityKg: e.target.value } : r)))
                            }
                          />
                        </td>
                        <td>
                          <Form.Select
                            value={row.disposition}
                            onChange={(e) =>
                              setRecipeRows((current) =>
                                current.map((r) =>
                                  r.key === row.key ? { ...r, disposition: e.target.value as ReturnDisposition } : r
                                )
                              )
                            }
                          >
                            {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => setRecipeRows((current) => current.filter((r) => r.key !== row.key))}
                          >
                            <i className="bi bi-trash" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {returnType === "purchase_return" && (
          <Card className="mb-3">
            <Card.Body>
              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>المورد *</Form.Label>
                    <Form.Select
                      value={supplierId}
                      onChange={(e) => {
                        setSupplierId(e.target.value);
                        setPurchaseOrderId("");
                      }}
                    >
                      <option value="">اختر...</option>
                      {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>أمر الشراء (المُستلَم) *</Form.Label>
                    <Form.Select value={purchaseOrderId} disabled={!supplierId} onChange={(e) => setPurchaseOrderId(e.target.value)}>
                      <option value="">اختر...</option>
                      {supplierOrders.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.orderNumber}
                        </option>
                      ))}
                    </Form.Select>
                    {supplierId && supplierOrders.length === 0 && (
                      <Form.Text className="text-muted">لا توجد أوامر شراء مُستلَمة لهذا المورد</Form.Text>
                    )}
                  </Form.Group>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {returnType === "purchase_return" && purchaseOrder && (
          <Card className="mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">أصناف المرتجع</span>
              <Button variant="outline-primary" size="sm" onClick={addBatchRow} type="button">
                <i className="bi bi-plus-lg me-1" />
                إضافة سطر
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 240 }}>الدفعة *</th>
                    <th style={{ minWidth: 140 }}>الكمية المرتجعة (كجم) *</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map((row) => {
                    const originalItem = purchaseOrder.items.find((i) => i.batchId === row.batchId);
                    return (
                      <tr key={row.key}>
                        <td>
                          <Form.Select
                            value={row.batchId}
                            onChange={(e) =>
                              setBatchRows((current) => current.map((r) => (r.key === row.key ? { ...r, batchId: e.target.value } : r)))
                            }
                          >
                            <option value="">اختر...</option>
                            {purchaseOrder.items
                              .filter((item) => item.batchId)
                              .map((item) => (
                                <option key={item.batchId} value={item.batchId}>
                                  {item.rawMaterialName}
                                </option>
                              ))}
                          </Form.Select>
                          {originalItem && (
                            <Form.Text className="text-muted">
                              الكمية المشتراة أصلًا: {formatNumber(originalItem.totalKg)} كجم
                            </Form.Text>
                          )}
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={row.quantityKg}
                            onChange={(e) =>
                              setBatchRows((current) => current.map((r) => (r.key === row.key ? { ...r, quantityKg: e.target.value } : r)))
                            }
                          />
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => setBatchRows((current) => current.filter((r) => r.key !== row.key))}
                          >
                            <i className="bi bi-trash" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {formError && <div className="text-danger small mb-2">{formError}</div>}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/returns")} type="button">
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

export default NewReturnPage;
