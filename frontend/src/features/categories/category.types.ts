export interface Category {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryConfig {
  apiBasePath: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
}
