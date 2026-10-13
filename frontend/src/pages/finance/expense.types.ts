export interface Expense {
  _id: string;
  expenseNumber: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  linkedSalesOrderId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFormValues {
  category: string;
  amount: string;
  expenseDate: string;
  description: string;
  linkedSalesOrderId: string;
  notes: string;
}
