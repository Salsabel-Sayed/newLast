import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { formatNumber } from "../../utils/format";
import type { ReturnedMixBatch } from "./returnedMixBatch.types";

interface ConvertToLossModalProps {
  batch: ReturnedMixBatch | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (quantityKg: number) => void;
}

function ConvertToLossModal({ batch, submitting, onClose, onConfirm }: ConvertToLossModalProps) {
  const [quantityKg, setQuantityKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batch) {
      setQuantityKg("");
      setError(null);
    }
  }, [batch]);

  if (!batch) return null;

  const availableQty = batch.remainingQty - batch.reservedQty;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const qty = Number(quantityKg);
    if (!(qty > 0)) {
      setError("يجب إدخال كمية أكبر من صفر");
      return;
    }
    if (qty > availableQty) {
      setError(`الكمية المتاحة للتحويل هي ${formatNumber(availableQty)} كجم فقط`);
      return;
    }
    onConfirm(qty);
  };

  return (
    <Modal show={batch !== null} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">تحويل إلى خسارة — {batch.recipeName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-light border small mb-3">الكمية المتاحة: {formatNumber(availableQty)} كجم</div>
          <Form.Group>
            <Form.Label>الكمية المطلوب تحويلها لخسارة (كجم) *</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step="any"
              value={quantityKg}
              isInvalid={!!error}
              onChange={(e) => setQuantityKg(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button variant="danger" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "تأكيد التحويل لخسارة"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default ConvertToLossModal;
