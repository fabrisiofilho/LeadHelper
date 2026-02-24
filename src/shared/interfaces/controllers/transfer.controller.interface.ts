import type { ApiResponse } from '../types/common.types';
import type {
  Transfer,
  CreateTransferInput,
  TransferFilters,
  TransferSummary,
} from '../types/transfer.types';

export interface ITransferController {
  create(data: CreateTransferInput): Promise<ApiResponse<Transfer>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Transfer>>;
  findAll(filters?: TransferFilters): Promise<ApiResponse<Transfer[]>>;
  getSummary(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ApiResponse<TransferSummary>>;
}
