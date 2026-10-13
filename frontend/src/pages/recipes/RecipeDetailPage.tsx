import { Card, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { Category } from "../../features/categories/category.types";
import type { EstimatedCost, Recipe } from "./recipe.types";

function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { items: categories } = useLookupList<Category>("/recipe-categories", true);
  const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));

  const recipeResource = useApiResource(() => apiClient.get<Recipe>(`/recipes/${id}`), [id]);
  const costResource = useApiResource(
    () => apiClient.get<EstimatedCost>(`/recipes/${id}/estimated-cost`),
    [id]
  );

  if (recipeResource.loading) return <LoadingState />;
  if (recipeResource.error) return <ErrorState message={recipeResource.error} onRetry={recipeResource.reload} />;
  if (!recipeResource.data) return null;

  const recipe = recipeResource.data;

  return (
    <div>
      <PageHeader
        title={recipe.name}
        description={`وصفة — كود ${recipe.code}${recipe.categoryId ? ` — ${categoryNameById.get(recipe.categoryId) ?? ""}` : ""}`}
        actions={
          <>
            <Link to="/recipes" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-right me-1" />
              رجوع للقائمة
            </Link>
            <Link to={`/recipes/${recipe._id}/edit`} className="btn btn-primary">
              <i className="bi bi-pencil me-1" />
              تعديل
            </Link>
          </>
        }
      />

      <div className="mb-3">
        {recipe.isActive ? (
          <StatusBadge label="نشطة" variant="success" />
        ) : (
          <StatusBadge label="غير نشطة" variant="secondary" />
        )}
      </div>

      <Card className="mb-3">
        <Card.Header className="bg-white fw-semibold">المكونات (لكل 1 كجم من التوليفة)</Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>المادة الخام</th>
                <th className="text-end">الكمية (جرام)</th>
                <th className="text-end">النسبة</th>
                {!costResource.loading && !costResource.error && costResource.data && (
                  <>
                    <th className="text-end">متوسط تكلفة الكجم</th>
                    <th className="text-end">تكلفة المكوّن</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {recipe.components.map((component) => {
                const costComponent = costResource.data?.components.find(
                  (c) => c.rawMaterialId === component.rawMaterialId
                );
                return (
                  <tr key={component.rawMaterialId}>
                    <td>
                      <div className="fw-semibold">{component.rawMaterialName}</div>
                      <div className="text-muted small">{component.rawMaterialCode}</div>
                    </td>
                    <td className="text-end">{formatNumber(component.gramsPerKg)}</td>
                    <td className="text-end text-muted">{(component.gramsPerKg / 10).toFixed(1)}%</td>
                    {!costResource.loading && !costResource.error && costResource.data && (
                      <>
                        <td className="text-end">{formatCurrency(costComponent?.averageCostPerKg ?? 0)}</td>
                        <td className="text-end">{formatCurrency(costComponent?.componentCost ?? 0)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-4">
          <div className="text-muted mb-2">التكلفة التقديرية لكل 1 كجم توليفة (محسوبة لحظيًا)</div>
          {costResource.loading && <LoadingState />}
          {!costResource.loading && costResource.error && (
            <ErrorState message={costResource.error} onRetry={costResource.reload} />
          )}
          {!costResource.loading && costResource.data && (
            <div className="display-6 fw-bold text-primary">{formatCurrency(costResource.data.costPerKg)}</div>
          )}
        </Card.Body>
      </Card>

      {recipe.notes && (
        <Card className="mt-3">
          <Card.Body>
            <div className="text-muted small mb-1">ملاحظات</div>
            <div>{recipe.notes}</div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export default RecipeDetailPage;
