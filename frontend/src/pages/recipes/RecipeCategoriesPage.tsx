import CategoryListPage from "../../features/categories/CategoryListPage";
import type { CategoryConfig } from "../../features/categories/category.types";

const CONFIG: CategoryConfig = {
  apiBasePath: "/recipe-categories",
  singularLabel: "فئة",
  pluralLabel: "فئات الوصفات",
  icon: "bi-bookmarks",
};

function RecipeCategoriesPage() {
  return <CategoryListPage config={CONFIG} />;
}

export default RecipeCategoriesPage;
