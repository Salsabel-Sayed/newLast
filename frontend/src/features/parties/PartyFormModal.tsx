import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import type { Party, PartyConfig, PartyFormValues } from "./party.types";

const EMPTY_VALUES: PartyFormValues = {
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  openingBalanceAmount: "0",
  openingBalanceSide: "they_owe_us",
  isActive: true,
  notes: "",
};

function toFormValues(party: Party): PartyFormValues {
  return {
    code: party.code,
    name: party.name,
    phone: party.phone ?? "",
    email: party.email ?? "",
    address: party.address ?? "",
    openingBalanceAmount: "0",
    openingBalanceSide: "they_owe_us",
    isActive: party.isActive,
    notes: party.notes ?? "",
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  code?: string;
  name?: string;
  email?: string;
  openingBalanceAmount?: string;
}

function validate(values: PartyFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.code.trim()) errors.code = "الكود مطلوب";
  if (!values.name.trim()) errors.name = "الاسم مطلوب";
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "صيغة البريد الإلكتروني غير صحيحة";
  }
  if (values.openingBalanceAmount.trim()) {
    const amount = Number(values.openingBalanceAmount);
    const hasMoreThanTwoDecimals =
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7;
    if (!Number.isFinite(amount) || amount < 0 || hasMoreThanTwoDecimals) {
      errors.openingBalanceAmount = "أدخلي مبلغًا صحيحًا بحد أقصى منزلتين عشريتين";
    }
  }
  return errors;
}

interface PartyFormModalProps {
  show: boolean;
  config: PartyConfig;
  party: Party | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: PartyFormValues) => void;
}

function PartyFormModal({ show, config, party, submitting, onClose, onSubmit }: PartyFormModalProps) {
  const [values, setValues] = useState<PartyFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (show) {
      setValues(party ? toFormValues(party) : EMPTY_VALUES);
      setErrors({});
    }
  }, [show, party]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">
            {party ? `تعديل بيانات ${config.singularLabel}` : `إضافة ${config.singularLabel} جديد`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-6">
              <Form.Group>
                <Form.Label>الكود *</Form.Label>
                <Form.Control
                  value={values.code}
                  isInvalid={!!errors.code}
                  onChange={(e) => setValues({ ...values, code: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>الاسم *</Form.Label>
                <Form.Control
                  value={values.name}
                  isInvalid={!!errors.name}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>رقم الهاتف</Form.Label>
                <Form.Control
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>البريد الإلكتروني</Form.Label>
                <Form.Control
                  value={values.email}
                  isInvalid={!!errors.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label>العنوان</Form.Label>
                <Form.Control
                  value={values.address}
                  onChange={(e) => setValues({ ...values, address: e.target.value })}
                />
              </Form.Group>
            </div>
            {!party && (
              <>
                <div className="col-6">
                  <Form.Group>
                    <Form.Label>الرصيد الافتتاحي</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      dir="ltr"
                      value={values.openingBalanceAmount}
                      isInvalid={!!errors.openingBalanceAmount}
                      onChange={(e) => setValues({ ...values, openingBalanceAmount: e.target.value })}
                    />
                    <Form.Control.Feedback type="invalid">{errors.openingBalanceAmount}</Form.Control.Feedback>
                    <Form.Text muted>اتركيه 0 لو مفيش رصيد سابق</Form.Text>
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group>
                    <Form.Label>طبيعة الرصيد</Form.Label>
                    <Form.Select
                      value={values.openingBalanceSide}
                      onChange={(e) => setValues({ ...values, openingBalanceSide: e.target.value as PartyFormValues["openingBalanceSide"] })}
                    >
                      <option value="they_owe_us">{config.partyType === "customer" ? "العميل عليه فلوس لنا" : "المورد عليه فلوس لنا"}</option>
                      <option value="we_owe_them">{config.partyType === "customer" ? "إحنا علينا فلوس للعميل" : "إحنا علينا فلوس للمورد"}</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              </>
            )}
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
            <div className="col-12">
              <Form.Check
                type="switch"
                id="party-active-switch"
                label="نشط"
                checked={values.isActive}
                onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
              />
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

export default PartyFormModal;
