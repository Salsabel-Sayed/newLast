import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { PAYMENT_METHOD_LABELS, type PaymentDirection, type PaymentMethod } from "./payment.types";

interface InvoiceOption {
  _id: string;
  invoiceNumber: string;
  remainingAmount: number;
  status: "unpaid" | "partial" | "paid";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormErrors {
  partyId?: string;
  amount?: string;
}

interface PaymentFormModalProps {
  show: boolean;
  direction: PaymentDirection;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    partyId: string;
    amount: number;
    paymentDate: string;
    method: PaymentMethod;
    relatedInvoiceId?: string;
  }) => void;
}

function PaymentFormModal({ show, direction, submitting, onClose, onSubmit }: PaymentFormModalProps) {
  const partyApiBasePath = direction === "collection" ? "/customers" : "/suppliers";
  const invoiceApiBasePath = direction === "collection" ? "/sales-invoices" : "/purchase-invoices";
  const partyLabel = direction === "collection" ? "العميل" : "المورد";

  const { items: parties } = useLookupList<Party>(partyApiBasePath);

  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [relatedInvoiceId, setRelatedInvoiceId] = useState("");
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (show) {
      setPartyId("");
      setAmount("");
      setPaymentDate(todayIsoDate());
      setMethod("cash");
      setRelatedInvoiceId("");
      setInvoices([]);
      setErrors({});
    }
  }, [show]);

  useEffect(() => {
    if (!partyId) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    const partyField = direction === "collection" ? "customerId" : "supplierId";
    apiClient
      .get<PaginatedResult<InvoiceOption>>(invoiceApiBasePath, { [partyField]: partyId, limit: 100 })
      .then((result) => {
        if (!cancelled) setInvoices(result.items.filter((invoice) => invoice.status !== "paid"));
      });
    return () => {
      cancelled = true;
    };
  }, [partyId, invoiceApiBasePath, direction]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors: FormErrors = {};
    if (!partyId) validationErrors.partyId = `يجب اختيار ${partyLabel}`;
    if (!(Number(amount) > 0)) validationErrors.amount = "يجب إدخال مبلغ أكبر من صفر";
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      partyId,
      amount: Number(amount),
      paymentDate: new Date(paymentDate).toISOString(),
      method,
      ...(relatedInvoiceId ? { relatedInvoiceId } : {}),
    });
  };

  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h6">{direction === "collection" ? "تحصيل جديد" : "سداد جديد"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{partyLabel} *</Form.Label>
            <Form.Select
              value={partyId}
              isInvalid={!!errors.partyId}
              onChange={(e) => {
                setPartyId(e.target.value);
                setRelatedInvoiceId("");
              }}
            >
              <option value="">اختر...</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.partyId}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>ربط بفاتورة (اختياري)</Form.Label>
            <Form.Select value={relatedInvoiceId} disabled={!partyId} onChange={(e) => setRelatedInvoiceId(e.target.value)}>
              <option value="">بدون ربط</option>
              {invoices.map((invoice) => (
                <option key={invoice._id} value={invoice._id}>
                  {invoice.invoiceNumber} — متبقي {formatCurrency(invoice.remainingAmount)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>المبلغ *</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step="any"
              value={amount}
              isInvalid={!!errors.amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>التاريخ *</Form.Label>
            <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </Form.Group>

          <Form.Group>
            <Form.Label>طريقة الدفع *</Form.Label>
            <Form.Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Form.Select>
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

export default PaymentFormModal;
