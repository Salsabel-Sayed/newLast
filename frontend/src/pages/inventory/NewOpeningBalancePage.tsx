import { useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../components/common/ToastProvider";
import { useLookupList } from "../../hooks/useLookupList";
import type { RawMaterial } from "./rawMaterial.types";
import type { Party } from "../../features/parties/party.types";
import { PACKAGE_TYPES, PACKAGE_TYPE_LABELS } from "../../features/inventory/packageTypes";
import type { OpeningBalanceItemFormRow } from "./openingBalance.types";
import { formatCurrency, formatNumber } from "../../utils/format";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `row-${rowKeySeed}`;
}

function emptyRow(): OpeningBalanceItemFormRow {
  return {
    key: nextRowKey(),
    rawMaterialId: "",
    supplierId: "",
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

function NewOpeningBalancePage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials");
  const { items: suppliers } = useLookupList<Party>("/suppliers");

  const [openingDate, setOpeningDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<OpeningBalanceItemFormRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const updateRow = (key: string, patch: Partial<OpeningBalanceItemFormRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const rowTotalKg = (row: OpeningBalanceItemFormRow): number =>
    (Number(row.packageCount) || 0) * (Number(row.kgPerPackage) || 0);

  const grandTotalCost = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!openingDate) {
      setFormError("تاريخ الرصيد الافتتاحي مطلوب");
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
        openingDate: new Date(openingDate).toISOString(),
        notes: notes.trim(),
        items: rows.map((row) => ({
          rawMaterialId: row.rawMaterialId,
          ...(row.supplierId ? { supplierId: row.supplierId } : {}),
          packageType: row.packageType,
          ...(row.packageType === "custom" ? { customPackageName: row.customPackageName.trim() } : {}),
          packageCount: Number(row.packageCount),
          kgPerPackage: Number(row.kgPerPackage),
          totalCost: Number(row.totalCost),
          ...(row.productionDate ? { productionDate: new Date(row.productionDate).toISOString() } : {}),
        })),
      };

      const created = await apiClient.post<{ _id: string }>("/opening-balances", payload);
      notify("تم إنشاء الرصيد الافتتاحي كمسودة بنجاح", "success");
      navigate(`/inventory/opening-balances/${created._id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="رصيد افتتاحي جديد" description="سيتم حفظه كمسودة، ولن يُنشئ دفعات مخزون إلا بعد الاعتماد" />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>تاريخ الرصيد الافتتاحي *</Form.Label>
                  <Form.Control
                    type="date"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                  />
                </Form.Group>
              </div>
              <div className="col-md-8">
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
                  <th style={{ minWidth: 160 }}>المورد</th>
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
                      <Form.Select
                        value={row.rawMaterialId}
                        onChange={(e) => updateRow(row.key, { rawMaterialId: e.target.value })}
                      >
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
                        value={row.supplierId}
                        onChange={(e) => updateRow(row.key, { supplierId: e.target.value })}
                      >
                        <option value="">بدون</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Select
                        value={row.packageType}
                        onChange={(e) =>
                          updateRow(row.key, { packageType: e.target.value as OpeningBalanceItemFormRow["packageType"] })
                        }
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
            <div>
              {formError && <span className="text-danger small">{formError}</span>}
            </div>
            <div className="fw-bold">إجمالي التكلفة: {formatCurrency(grandTotalCost)}</div>
          </Card.Footer>
        </Card>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/inventory/opening-balances")} type="button">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ كمسودة"}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default NewOpeningBalancePage;
