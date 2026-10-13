import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

interface ReasonPromptModalProps {
  show: boolean;
  title: string;
  label: string;
  confirmLabel?: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function ReasonPromptModal({ show, title, label, confirmLabel = "تأكيد", submitting, onClose, onConfirm }: ReasonPromptModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setReason("");
      setError(null);
    }
  }, [show]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError("هذا الحقل مطلوب");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>{label}</Form.Label>
            <Form.Control as="textarea" rows={3} value={reason} isInvalid={!!error} onChange={(e) => setReason(e.target.value)} />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>
            تراجع
          </Button>
          <Button variant="danger" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : confirmLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default ReasonPromptModal;
