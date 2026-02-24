import { ApiResponse } from '../types/common.types';
import {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../types/category.types';
export interface ICategoryController {
  create(data: CreateCategoryInput): Promise<ApiResponse<Category>>;
  update(id: number, data: UpdateCategoryInput): Promise<ApiResponse<Category>>;
  delete(id: number, replacementId?: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Category>>;
  findAll(): Promise<ApiResponse<Category[]>>;
  findByType(type: CategoryType): Promise<ApiResponse<Category[]>>;
  initializeDefaults(): Promise<ApiResponse<void>>;
}
