import { useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { apiClient } from "../../api/client";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatNumber } from "../../utils/format";
import type { Recipe } from "../recipes/recipe.types";
import type { ReturnedMixReportRow } from "./reports.types";

function ReturnedMixReportView() {
  const [recipeId, setRecipeId] = useState("");
  const { items: recipes } = useLookupList<Recipe>("/recipes", true);

  const { data, loading, error, reload } = useApiResource(
    () => apiClient.get<ReturnedMixReportRow[]>("/reports/returned-mix", { recipeId: recipeId || undefined }),
    [recipeId]
  );

  return (
    <div>
      <div className="mb-3" style={{ maxWidth: 260 }}>
        <Form.Label className="small text-muted mb-1">التوليفة</Form.Label>
        <Form.Select size="sm" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
          <option value="">الكل</option>
          {recipes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </Form.Select>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && data && (
        <Card>
          <Card.Body className="p-0">
            {data.length === 0 ? (
              <EmptyState icon="bi-recycle" title="لا توجد بيانات" />
            ) : (
              <Table responsive hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>التوليفة</th>
                    <th className="text-end">المتاح حاليًا</th>
                    <th className="text-end">المباع</th>
                    <th className="text-end">الخسائر</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.recipeId}>
                      <td className="fw-semibold">{row.name}</td>
                      <td className="text-end">{formatNumber(row.available)}</td>
                      <td className="text-end">{formatNumber(row.sold)}</td>
                      <td className="text-end text-danger">{formatNumber(row.losses)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export default ReturnedMixReportView;
