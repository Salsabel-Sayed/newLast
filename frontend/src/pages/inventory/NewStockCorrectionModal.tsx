import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import { useLookupList } from "../../hooks/useLookupList";
import { formatNumber } from "../../utils/format";
import type { RawMaterial } from "./rawMaterial.types";
import type { Batch } from "./batch.types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormErrors {
  rawMaterialId?: string;
  batchId?: string;
  quantityAfterKg?: string;
  reason?: string;
  correctionDate?: string;
}

interface NewStockCorrectionModalProps {
  show: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    batchId: string;
    quantityAfterKg: number;
    reason: string;
    correctionDate: string;
    notes: string;
  }) => void;
}

function NewStockCorrectionModal({ show, submitting, onClose, onSubmit }: NewStockCorrectionModalProps) {
  const { items: rawMaterials } = useLookupList<RawMaterial>("/raw-materials");
  const [rawMaterialId, setRawMaterialId] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [quantityAfterKg, setQuantityAfterKg] = useState("");
  const [reason, setReason] = useState("");
  const [correctionDate, setCorrectionDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (show) {
      setRawMaterialId("");
      setBatches([]);
      setBatchId("");
      setQuantityAfterKg("");
      setReason("");
      setCorrectionDate(todayIsoDate());
      setNotes("");
      setErrors({});
    }
  }, [show]);

  useEffect(() => {
    if (!rawMaterialId) {
      setBatches([]);
      setBatchId("");
      return;
    }
    let cancelled = false;
    setBatchesLoading(true);
    apiClient
      .get<PaginatedResult<Batch>>("/batches", { rawMaterialId, status: "active", limit: 100 })
      .then((result) => {
        if (!cancelled) setBatches(result.items);
      })
      .finally(() => {
        if (!cancelled) setBatchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawMaterialId]);

  const selectedBatch = batches.find((b) => b._id === batchId) ?? null;
  const differenceKg = selectedBatch && quantityAfterKg !== "" ? Number(quantityAfterKg) - selectedBatch.remainingQty : null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors: FormErrors = {};
    if (!rawMaterialId) validationErrors.rawMaterialId = "اختر مادة خام";
    if (!batchId) validationErrors.batchId = "اختر دفعة";
    const qty = Number(quantityAfterKg);
    if (quantityAfterKg.trim() === "" || Number.isNaN(qty) || qty < 0) {
      validationErrors.quantityAfterKg = "أدخل كمية صحيحة لا تقل عن صفر";
    }
    if (!reason.trim()) validationErrors.reason = "سبب التصحيح مطلوب";
    if (!correctionDate) validationErrors.correctionDate = "تاريخ التصحيح مطلوب";

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      batchId,
      quantityAfterKg: qty,
      reason: reason.trim(),
      correctionDate: new Date(correctionDate).toISOString(),
      notes: notes.trim(),
    });
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">تصحيح مخزون جديد</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>المادة الخام *</Form.Label>
            <Form.Select
              value={rawMaterialId}
              isInvalid={!!errors.rawMaterialId}
              onChange={(e) => setRawMaterialId(e.target.value)}
            >
              <option value="">اختر...</option>
              {rawMaterials.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.rawMaterialId}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>الدفعة *</Form.Label>
            <Form.Select
              value={batchId}
              isInvalid={!!errors.batchId}
              disabled={!rawMaterialId || batchesLoading}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">{batchesLoading ? "جارٍ التحميل..." : "اختر..."}</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.batchCode} — متبقي {formatNumber(b.remainingQty)} كجم
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.batchId}</Form.Control.Feedback>
          </Form.Group>

          {selectedBatch && (
            <div className="alert alert-light border small mb-3">
              الكمية الحالية: <strong>{formatNumber(selectedBatch.remainingQty)}</strong> كجم
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>الكمية الصحيحة الجديدة (كجم) *</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step="any"
              value={quantityAfterKg}
              isInvalid={!!errors.quantityAfterKg}
              onChange={(e) => setQuantityAfterKg(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{errors.quantityAfterKg}</Form.Control.Feedback>
            {differenceKg !== null && (
              <Form.Text className={differenceKg === 0 ? "text-muted" : differenceKg > 0 ? "text-success" : "text-danger"}>
                الفرق: {differenceKg > 0 ? "+" : ""}
                {formatNumber(differenceKg)} كجم
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>تاريخ التصحيح *</Form.Label>
            <Form.Control
              type="date"
              value={correctionDate}
              isInvalid={!!errors.correctionDate}
              onChange={(e) => setCorrectionDate(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{errors.correctionDate}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>سبب التصحيح *</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={reason}
              isInvalid={!!errors.reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: جرد فعلي، خطأ إدخال..."
            />
            <Form.Control.Feedback type="invalid">{errors.reason}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group>
            <Form.Label>ملاحظات</Form.Label>
            <Form.Control as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default NewStockCorrectionModal;
