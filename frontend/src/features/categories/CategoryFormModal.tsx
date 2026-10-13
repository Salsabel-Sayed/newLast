import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import type { Category, CategoryConfig } from "./category.types";

interface FormValues {
  name: string;
  isActive: boolean;
}

const EMPTY_VALUES: FormValues = { name: "", isActive: true };

interface CategoryFormModalProps {
  show: boolean;
  config: CategoryConfig;
  category: Category | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

function CategoryFormModal({ show, config, category, submitting, onClose, onSubmit }: CategoryFormModalProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setValues(category ? { name: category.name, isActive: category.isActive } : EMPTY_VALUES);
      setError(null);
    }
  }, [show, category]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    onSubmit(values);
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">
            {category ? `تعديل ${config.singularLabel}` : `إضافة ${config.singularLabel} جديدة`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>الاسم *</Form.Label>
            <Form.Control
              value={values.name}
              isInvalid={!!error}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
          <Form.Check
            type="switch"
            id="category-active-switch"
            label="نشطة"
            checked={values.isActive}
            onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
          />
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

export default CategoryFormModal;
