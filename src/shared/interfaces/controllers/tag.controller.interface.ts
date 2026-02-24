import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TransactionTag,
} from '../types/tag.types';
import type { ApiResponse } from '../types/api.types';

export interface ITagController {
  create(input: CreateTagInput): Promise<ApiResponse<Tag>>;
  update(id: number, input: UpdateTagInput): Promise<ApiResponse<Tag>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findAll(): Promise<ApiResponse<Tag[]>>;
  getTransactionTags(
    transactionId: number,
  ): Promise<ApiResponse<TransactionTag[]>>;
  setTransactionTags(
    transactionId: number,
    tagIds: number[],
  ): Promise<ApiResponse<void>>;
}
