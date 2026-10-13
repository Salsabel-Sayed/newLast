export interface RecipeComponent {
  rawMaterialId: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
}

export interface Recipe {
  _id: string;
  code: string;
  name: string;
  categoryId?: string;
  components: RecipeComponent[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstimatedCostComponent {
  rawMaterialId: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  gramsPerKg: number;
  averageCostPerKg: number;
  componentCost: number;
}

export interface EstimatedCost {
  recipeId: string;
  costPerKg: number;
  components: EstimatedCostComponent[];
}

export interface RecipeComponentFormRow {
  key: string;
  rawMaterialId: string;
  gramsPerKg: string;
}
