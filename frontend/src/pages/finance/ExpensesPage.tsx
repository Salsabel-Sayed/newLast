import { useState } from "react";
import { Button, Card, Form, InputGroup, Table } from "react-bootstrap";
import { apiClient, ApiError } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Expense, ExpenseFormValues } from "./expense.types";
import ExpenseFormModal from "./ExpenseFormModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

function ExpensesPage() {
  const [category, setCategory] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { notify } = useToast();

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<Expense>>("/expenses", {
        category: category || undefined,
        page,
        limit: 20,
      }),
    [category, page]
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setCategory(categoryInput.trim());
  };

  const openCreateForm = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        category: values.category.trim(),
        amount: Number(values.amount),
        expenseDate: new Date(values.expenseDate).toISOString(),
        description: values.description.trim(),
        ...(values.linkedSalesOrderId ? { linkedSalesOrderId: values.linkedSalesOrderId } : {}),
        notes: values.notes.trim(),
      };

      if (editingExpense) {
        await apiClient.put(`/expenses/${editingExpense._id}`, payload);
        notify("تم تحديث المصروف بنجاح", "success");
      } else {
        await apiClient.post("/expenses", payload);
        notify("تمت إضافة المصروف بنجاح", "success");
      }

      setFormOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="المصروفات"
        description="مستقلة تمامًا، لا تؤثر على تكلفة المخزون"
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-1" />
            إضافة مصروف
          </Button>
        }
      />

      <Card>
        <Card.Header className="bg-white">
          <Form onSubmit={handleSearchSubmit} style={{ maxWidth: 320 }}>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search" />
              </InputGroup.Text>
              <Form.Control
                placeholder="بحث بالفئة..."
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
              />
            </InputGroup>
          </Form>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-wallet2" title="لا توجد مصروفات" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>الفئة</th>
                  <th>الوصف</th>
                  <th>التاريخ</th>
                  <th className="text-end">المبلغ</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((expense) => (
                  <tr key={expense._id}>
                    <td className="text-muted">{expense.expenseNumber}</td>
                    <td className="fw-semibold">{expense.category}</td>
                    <td>{expense.description}</td>
                    <td>{formatDate(expense.expenseDate)}</td>
                    <td className="text-end">{formatCurrency(expense.amount)}</td>
                    <td className="text-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => openEditForm(expense)}>
                        <i className="bi bi-pencil" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {data && data.totalPages > 1 && (
          <Card.Footer className="bg-white">
            <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </Card.Footer>
        )}
      </Card>

      <ExpenseFormModal
        show={formOpen}
        expense={editingExpense}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default ExpensesPage;
