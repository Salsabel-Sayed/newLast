import { Table } from "react-bootstrap";
import { formatCurrency, formatNumber } from "../../utils/format";
import { DISPOSITION_LABELS, type ReturnItem, type ReturnType } from "./return.types";

interface ReturnLineItemsTableProps {
  items: ReturnItem[];
  returnType: ReturnType;
}

// Purchase returns are cost-only (no selling price ever existed for them); sales returns
// (raw material or recipe) always carry both the FIFO cost and the original sale price.
function ReturnLineItemsTable({ items, returnType }: ReturnLineItemsTableProps) {
  const showSellingPrice = returnType !== "purchase_return";
  const showDisposition = returnType === "sales_recipe";
  const showBatch = returnType === "purchase_return";

  const totalCost = items.reduce((sum, item) => sum + item.quantityKg * item.unitCostPerKg, 0);
  const totalSelling = items.reduce(
    (sum, item) => sum + (item.unitPrice !== undefined ? item.quantityKg * item.unitPrice : 0),
    0
  );
  const labelColSpan = 1 + (showDisposition ? 1 : 0) + (showBatch ? 1 : 0) + 1 + 1 + (showSellingPrice ? 1 : 0);

  return (
    <Table responsive size="sm" className="mb-0 align-middle">
      <thead>
        <tr>
          <th>الصنف</th>
          {showDisposition && <th>طريقة التعامل</th>}
          {showBatch && <th>الدفعة</th>}
          <th className="text-end">الكمية (كجم)</th>
          <th className="text-end">تكلفة الكجم</th>
          {showSellingPrice && <th className="text-end">سعر بيع الكجم</th>}
          <th className="text-end">إجمالي التكلفة</th>
          {showSellingPrice && <th className="text-end">إجمالي سعر البيع</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td className="fw-semibold">{item.rawMaterialName ?? item.recipeName ?? "—"}</td>
            {showDisposition && (
              <td className="text-muted small">{item.disposition ? DISPOSITION_LABELS[item.disposition] : "—"}</td>
            )}
            {showBatch && <td className="text-muted small">{item.batchCode ?? "—"}</td>}
            <td className="text-end">{formatNumber(item.quantityKg)}</td>
            <td className="text-end">{formatCurrency(item.unitCostPerKg)}</td>
            {showSellingPrice && (
              <td className="text-end">{item.unitPrice !== undefined ? formatCurrency(item.unitPrice) : "—"}</td>
            )}
            <td className="text-end">{formatCurrency(item.quantityKg * item.unitCostPerKg)}</td>
            {showSellingPrice && <td className="text-end fw-semibold">{formatCurrency(item.lineTotal)}</td>}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="fw-bold">
          <td colSpan={labelColSpan}>الإجمالي</td>
          <td className="text-end">{formatCurrency(totalCost)}</td>
          {showSellingPrice && <td className="text-end">{formatCurrency(totalSelling)}</td>}
        </tr>
      </tfoot>
    </Table>
  );
}

export default ReturnLineItemsTable;
