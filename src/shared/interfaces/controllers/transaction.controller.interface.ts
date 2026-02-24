import { ApiResponse, PageResult } from '../types/common.types';
import {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  MonthSummary,
} from '../types/transaction.types';
export interface ITransactionController {
  create(data: CreateTransactionInput): Promise<ApiResponse<Transaction>>;
  update(
    id: number,
    data: UpdateTransactionInput,
  ): Promise<ApiResponse<Transaction>>;
  delete(
    id: number,
    deleteAllInstallments?: boolean,
  ): Promise<ApiResponse<void>>;
  deleteMany(ids: number[]): Promise<ApiResponse<number>>;
  findById(id: number): Promise<ApiResponse<Transaction>>;
  findAll(
    filters?: TransactionFilters,
  ): Promise<ApiResponse<PageResult<Transaction>>>;
  findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<ApiResponse<Transaction[]>>;
  findByCategory(categoryId: number): Promise<ApiResponse<Transaction[]>>;
  getMonthSummary(
    year: number,
    month: number,
  ): Promise<ApiResponse<MonthSummary>>;
}
