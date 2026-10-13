import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

interface TypeToConfirmModalProps {
  show: boolean;
  title: string;
  description: string;
  confirmPhrase: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function TypeToConfirmModal({ show, title, description, confirmPhrase, submitting, onClose, onConfirm }: TypeToConfirmModalProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (show) setTyped("");
  }, [show]);

  const matches = typed.trim() === confirmPhrase;

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="text-danger">
          <i className="bi bi-exclamation-octagon-fill me-2" />
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{description}</p>
        <p className="text-danger fw-semibold small">هذا الإجراء نهائي ولا يمكن التراجع عنه.</p>
        <Form.Group>
          <Form.Label>
            للتأكيد، اكتب <span className="fw-bold">{confirmPhrase}</span> في الحقل أدناه
          </Form.Label>
          <Form.Control value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>
          إلغاء
        </Button>
        <Button variant="danger" disabled={!matches || submitting} onClick={onConfirm}>
          {submitting ? "جارٍ التنفيذ..." : "تنفيذ الإجراء نهائيًا"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TypeToConfirmModal;
