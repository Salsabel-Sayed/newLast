import { Schema, model, Types } from "mongoose";

export interface ExpenseAttrs {
  expenseNumber: string;
  category: string;
  amount: number;
  expenseDate: Date;
  description: string;
  linkedSalesOrderId?: Types.ObjectId;
  notes?: string;
}

const expenseSchema = new Schema<ExpenseAttrs>(
  {
    expenseNumber: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true },
    description: { type: String, required: true },
    linkedSalesOrderId: { type: Schema.Types.ObjectId, ref: "SalesOrder" },
    notes: { type: String },
  },
  { timestamps: true }
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ linkedSalesOrderId: 1 });

export const ExpenseModel = model<ExpenseAttrs>("Expense", expenseSchema);
