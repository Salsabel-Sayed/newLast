import CategoryListPage from "../../features/categories/CategoryListPage";
import type { CategoryConfig } from "../../features/categories/category.types";

const CONFIG: CategoryConfig = {
  apiBasePath: "/raw-material-categories",
  singularLabel: "فئة",
  pluralLabel: "فئات المواد الخام",
  icon: "bi-tags",
};

function RawMaterialCategoriesPage() {
  return <CategoryListPage config={CONFIG} />;
}

export default RawMaterialCategoriesPage;
