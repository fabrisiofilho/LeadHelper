export type CategoryType = 'income' | 'expense';
export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  icon?: string;
  isDefault: boolean;
}
export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
}
export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
}
