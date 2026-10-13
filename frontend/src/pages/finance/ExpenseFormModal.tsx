import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useLookupList } from "../../hooks/useLookupList";
import type { SalesOrder } from "../sales/salesOrder.types";
import type { Expense, ExpenseFormValues } from "./expense.types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_VALUES: ExpenseFormValues = {
  category: "",
  amount: "",
  expenseDate: todayIsoDate(),
  description: "",
  linkedSalesOrderId: "",
  notes: "",
};

function toFormValues(expense: Expense): ExpenseFormValues {
  return {
    category: expense.category,
    amount: String(expense.amount),
    expenseDate: expense.expenseDate.slice(0, 10),
    description: expense.description,
    linkedSalesOrderId: expense.linkedSalesOrderId ?? "",
    notes: expense.notes ?? "",
  };
}

interface FormErrors {
  category?: string;
  amount?: string;
  description?: string;
}

interface ExpenseFormModalProps {
  show: boolean;
  expense: Expense | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
}

function ExpenseFormModal({ show, expense, submitting, onClose, onSubmit }: ExpenseFormModalProps) {
  const { items: salesOrders } = useLookupList<SalesOrder>("/sales-orders", true);
  const [values, setValues] = useState<ExpenseFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (show) {
      setValues(expense ? toFormValues(expense) : EMPTY_VALUES);
      setErrors({});
    }
  }, [show, expense]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors: FormErrors = {};
    if (!values.category.trim()) validationErrors.category = "الفئة مطلوبة";
    if (!(Number(values.amount) > 0)) validationErrors.amount = "يجب إدخال مبلغ أكبر من صفر";
    if (!values.description.trim()) validationErrors.description = "الوصف مطلوب";
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">{expense ? "تعديل مصروف" : "إضافة مصروف جديد"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-6">
              <Form.Group>
                <Form.Label>الفئة *</Form.Label>
                <Form.Control
                  value={values.category}
                  isInvalid={!!errors.category}
                  onChange={(e) => setValues({ ...values, category: e.target.value })}
                  placeholder="مثال: إيجار، رواتب، صيانة..."
                />
                <Form.Control.Feedback type="invalid">{errors.category}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>المبلغ *</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="any"
                  value={values.amount}
                  isInvalid={!!errors.amount}
                  onChange={(e) => setValues({ ...values, amount: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>تاريخ المصروف *</Form.Label>
                <Form.Control
                  type="date"
                  value={values.expenseDate}
                  onChange={(e) => setValues({ ...values, expenseDate: e.target.value })}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>أمر بيع مرتبط (اختياري)</Form.Label>
                <Form.Select
                  value={values.linkedSalesOrderId}
                  onChange={(e) => setValues({ ...values, linkedSalesOrderId: e.target.value })}
                >
                  <option value="">بدون ربط</option>
                  {salesOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label>الوصف *</Form.Label>
                <Form.Control
                  value={values.description}
                  isInvalid={!!errors.description}
                  onChange={(e) => setValues({ ...values, description: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label>ملاحظات</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={values.notes}
                  onChange={(e) => setValues({ ...values, notes: e.target.value })}
                />
              </Form.Group>
            </div>
          </div>
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

export default ExpenseFormModal;
