import type { ApiResponse } from '../types/common.types';
import type {
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetFilters,
  BudgetSummary,
  BudgetAlert,
} from '../types/budget.types';

export interface IBudgetController {
  create(data: CreateBudgetInput): Promise<ApiResponse<Budget>>;
  update(id: number, data: UpdateBudgetInput): Promise<ApiResponse<Budget>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Budget>>;
  findAll(filters?: BudgetFilters): Promise<ApiResponse<Budget[]>>;
  getSummary(year: number, month: number): Promise<ApiResponse<BudgetSummary>>;
  getAlerts(year: number, month: number): Promise<ApiResponse<BudgetAlert[]>>;
  copyFromPreviousMonth(
    year: number,
    month: number,
  ): Promise<ApiResponse<Budget[]>>;
}
