import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import SearchableMultiSelect from "../../components/common/SearchableMultiSelect";
import type { Category } from "../../features/categories/category.types";
import type { Party } from "../../features/parties/party.types";
import type { RawMaterial, RawMaterialFormValues } from "./rawMaterial.types";

const EMPTY_VALUES: RawMaterialFormValues = {
  code: "",
  name: "",
  categoryId: "",
  minStockLevel: "0",
  supplierIds: [],
  isActive: true,
  notes: "",
};

function toFormValues(item: RawMaterial): RawMaterialFormValues {
  return {
    code: item.code,
    name: item.name,
    categoryId: item.categoryId ?? "",
    minStockLevel: String(item.minStockLevel),
    supplierIds: item.supplierIds,
    isActive: item.isActive,
    notes: item.notes ?? "",
  };
}

interface FormErrors {
  code?: string;
  name?: string;
  minStockLevel?: string;
}

function validate(values: RawMaterialFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.code.trim()) errors.code = "الكود مطلوب";
  if (!values.name.trim()) errors.name = "الاسم مطلوب";
  const minStock = Number(values.minStockLevel);
  if (values.minStockLevel.trim() === "" || Number.isNaN(minStock) || minStock < 0) {
    errors.minStockLevel = "يجب أن يكون رقمًا صحيحًا لا يقل عن صفر";
  }
  return errors;
}

interface RawMaterialFormModalProps {
  show: boolean;
  item: RawMaterial | null;
  categories: Category[];
  suppliers: Party[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: RawMaterialFormValues) => void;
}

function RawMaterialFormModal({
  show,
  item,
  categories,
  suppliers,
  submitting,
  onClose,
  onSubmit,
}: RawMaterialFormModalProps) {
  const [values, setValues] = useState<RawMaterialFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (show) {
      setValues(item ? toFormValues(item) : EMPTY_VALUES);
      setErrors({});
    }
  }, [show, item]);

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
          <Modal.Title as="h6">{item ? "تعديل مادة خام" : "إضافة مادة خام جديدة"}</Modal.Title>
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
                <Form.Label>الفئة</Form.Label>
                <Form.Select
                  value={values.categoryId}
                  onChange={(e) => setValues({ ...values, categoryId: e.target.value })}
                >
                  <option value="">بدون فئة</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group>
                <Form.Label>حد الطلب الأدنى (كجم)</Form.Label>
                <Form.Control
                  type="number" dir="ltr" lang="en-US"
                  min={0}
                  step="any"
                  value={values.minStockLevel}
                  isInvalid={!!errors.minStockLevel}
                  onChange={(e) => setValues({ ...values, minStockLevel: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">{errors.minStockLevel}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Label>الموردون المعتمدون</Form.Label>
              <SearchableMultiSelect
                options={suppliers.map((supplier) => ({ value: supplier._id, label: supplier.name }))}
                selectedValues={values.supplierIds}
                onChange={(supplierIds) => setValues({ ...values, supplierIds })}
                placeholder="بحث عن مورد..."
                emptyMessage="لا يوجد موردون مطابقون"
              />
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
            <div className="col-12">
              <Form.Check
                type="switch"
                id="raw-material-active-switch"
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

export default RawMaterialFormModal;
