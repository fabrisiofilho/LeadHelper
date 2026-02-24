import type { ApiResponse } from '../types/common.types';
import type {
  BankImport,
  BankImportTransaction,
  CreateBankImportInput,
  ProcessImportInput,
  BankImportResult,
  ReconciliationSuggestion,
} from '../types/bank-import.types';

export interface IBankImportController {
  create(data: CreateBankImportInput): Promise<ApiResponse<BankImport>>;
  process(data: ProcessImportInput): Promise<ApiResponse<BankImportResult>>;
  findById(id: number): Promise<ApiResponse<BankImport>>;
  getTransactions(
    importId: number,
  ): Promise<ApiResponse<BankImportTransaction[]>>;
  getReconciliationSuggestions(
    importId: number,
  ): Promise<ApiResponse<ReconciliationSuggestion[]>>;
  delete(id: number): Promise<ApiResponse<void>>;
}
