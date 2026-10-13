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
import { formatCurrency, formatNumber } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import type { RawMaterial } from "../inventory/rawMaterial.types";
import { PACKAGE_TYPES, PACKAGE_TYPE_LABELS } from "../../features/inventory/packageTypes";
import type { PurchaseOrder, PurchaseOrderItemFormRow } from "./purchaseOrder.types";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `po-row-${rowKeySeed}`;
}

function emptyRow(): PurchaseOrderItemFormRow {
  return {
    key: nextRowKey(),
    rawMaterialId: "",
    packageType: "sack",
    customPackageName: "",
    packageCount: "",
    kgPerPackage: "",
    totalCost: "",
    productionDate: "",
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { notify } = useToast();

  const { items: suppliers } = useLookupList<Party>("/suppliers");
  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials");

  const orderResource = useApiResource(
    () => (isEdit ? apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`) : Promise.resolve(null)),
    [id]
  );

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<PurchaseOrderItemFormRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!isEdit);

  useEffect(() => {
    if (isEdit && orderResource.data && !initialized) {
      const order = orderResource.data;
      if (order.status !== "draft") {
        notify("لا يمكن تعديل أمر شراء بعد استلامه أو إلغائه", "warning");
        navigate(`/purchases/orders/${order._id}`);
        return;
      }
      setSupplierId(order.supplierId);
      setPurchaseDate(order.purchaseDate.slice(0, 10));
      setNotes(order.notes ?? "");
      setRows(
        order.items.map((item) => ({
          key: nextRowKey(),
          rawMaterialId: item.rawMaterialId,
          packageType: item.packageType,
          customPackageName: item.customPackageName ?? "",
          packageCount: String(item.packageCount),
          kgPerPackage: String(item.kgPerPackage),
          totalCost: String(item.totalCost),
          productionDate: item.productionDate ? item.productionDate.slice(0, 10) : "",
        }))
      );
      setInitialized(true);
    }
  }, [isEdit, orderResource.data, initialized, navigate, notify]);

  const updateRow = (key: string, patch: Partial<PurchaseOrderItemFormRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const rowTotalKg = (row: PurchaseOrderItemFormRow): number =>
    (Number(row.packageCount) || 0) * (Number(row.kgPerPackage) || 0);

  const grandTotalCost = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0);
  const grandTotalKg = rows.reduce((sum, row) => sum + rowTotalKg(row), 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError("يجب اختيار المورد");
      return;
    }
    if (!purchaseDate) {
      setFormError("تاريخ الشراء مطلوب");
      return;
    }
    for (const row of rows) {
      if (!row.rawMaterialId) {
        setFormError("يجب اختيار مادة خام لكل سطر");
        return;
      }
      if (row.packageType === "custom" && !row.customPackageName.trim()) {
        setFormError("يجب إدخال اسم نوع التعبئة عند اختيار 'أخرى'");
        return;
      }
      if (!(Number(row.packageCount) > 0)) {
        setFormError("عدد العبوات يجب أن يكون أكبر من صفر");
        return;
      }
      if (!(Number(row.kgPerPackage) > 0)) {
        setFormError("وزن العبوة يجب أن يكون أكبر من صفر");
        return;
      }
      if (!(Number(row.totalCost) >= 0)) {
        setFormError("إجمالي التكلفة غير صحيح");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        purchaseDate: new Date(purchaseDate).toISOString(),
        notes: notes.trim(),
        items: rows.map((row) => ({
          rawMaterialId: row.rawMaterialId,
          packageType: row.packageType,
          ...(row.packageType === "custom" ? { customPackageName: row.customPackageName.trim() } : {}),
          packageCount: Number(row.packageCount),
          kgPerPackage: Number(row.kgPerPackage),
          totalCost: Number(row.totalCost),
          ...(row.productionDate ? { productionDate: new Date(row.productionDate).toISOString() } : {}),
        })),
      };

      if (isEdit) {
        await apiClient.put(`/purchase-orders/${id}`, payload);
        notify("تم تحديث أمر الشراء بنجاح", "success");
        navigate(`/purchases/orders/${id}`);
      } else {
        const created = await apiClient.post<{ _id: string }>("/purchase-orders", payload);
        notify("تم إنشاء أمر الشراء بنجاح", "success");
        navigate(`/purchases/orders/${created._id}`);
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
      <PageHeader title={isEdit ? "تعديل أمر الشراء" : "أمر شراء جديد"} />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-5">
                <Form.Group>
                  <Form.Label>المورد *</Form.Label>
                  <Form.Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">اختر...</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>تاريخ الشراء *</Form.Label>
                  <Form.Control type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>ملاحظات</Form.Label>
                  <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">الأصناف</span>
            <Button variant="outline-primary" size="sm" onClick={addRow} type="button">
              <i className="bi bi-plus-lg me-1" />
              إضافة سطر
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>المادة الخام *</th>
                  <th style={{ minWidth: 140 }}>نوع التعبئة *</th>
                  <th style={{ minWidth: 110 }}>عدد العبوات *</th>
                  <th style={{ minWidth: 110 }}>وزن العبوة (كجم) *</th>
                  <th className="text-end" style={{ minWidth: 100 }}>
                    الإجمالي (كجم)
                  </th>
                  <th style={{ minWidth: 120 }}>إجمالي التكلفة *</th>
                  <th style={{ minWidth: 150 }}>تاريخ الإنتاج</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <Form.Select value={row.rawMaterialId} onChange={(e) => updateRow(row.key, { rawMaterialId: e.target.value })}>
                        <option value="">اختر...</option>
                        {rawMaterials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Select
                        value={row.packageType}
                        onChange={(e) => updateRow(row.key, { packageType: e.target.value as PurchaseOrderItemFormRow["packageType"] })}
                      >
                        {PACKAGE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {PACKAGE_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </Form.Select>
                      {row.packageType === "custom" && (
                        <Form.Control
                          className="mt-1"
                          placeholder="اسم نوع التعبئة"
                          value={row.customPackageName}
                          onChange={(e) => updateRow(row.key, { customPackageName: e.target.value })}
                        />
                      )}
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        step="any"
                        value={row.packageCount}
                        onChange={(e) => updateRow(row.key, { packageCount: e.target.value })}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        step="any"
                        value={row.kgPerPackage}
                        onChange={(e) => updateRow(row.key, { kgPerPackage: e.target.value })}
                      />
                    </td>
                    <td className="text-end fw-semibold">{formatNumber(rowTotalKg(row))}</td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        step="any"
                        value={row.totalCost}
                        onChange={(e) => updateRow(row.key, { totalCost: e.target.value })}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="date"
                        value={row.productionDate}
                        onChange={(e) => updateRow(row.key, { productionDate: e.target.value })}
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
            <div className="fw-bold">
              الإجمالي: {formatNumber(grandTotalKg)} كجم — {formatCurrency(grandTotalCost)}
            </div>
          </Card.Footer>
        </Card>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/purchases/orders")} type="button">
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

export default PurchaseOrderFormPage;
