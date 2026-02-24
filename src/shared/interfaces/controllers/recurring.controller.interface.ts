import type { ApiResponse } from '../types/common.types';
import type {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  RecurringTransactionFilters,
  RecurringGenerationResult,
} from '../types/recurring.types';

export interface IRecurringController {
  create(
    data: CreateRecurringTransactionInput,
  ): Promise<ApiResponse<RecurringTransaction>>;
  update(
    id: number,
    data: UpdateRecurringTransactionInput,
  ): Promise<ApiResponse<RecurringTransaction>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<RecurringTransaction>>;
  findAll(
    filters?: RecurringTransactionFilters,
  ): Promise<ApiResponse<RecurringTransaction[]>>;
  generate(): Promise<ApiResponse<RecurringGenerationResult>>;
}
