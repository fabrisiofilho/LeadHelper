import { ApiResponse } from '../types/common.types';
import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '../types/account.types';
export interface IAccountController {
  create(data: CreateAccountInput): Promise<ApiResponse<Account>>;
  update(id: number, data: UpdateAccountInput): Promise<ApiResponse<Account>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Account>>;
  findAll(): Promise<ApiResponse<Account[]>>;
  getBalance(id: number): Promise<ApiResponse<number>>;
  getTotalBalance(): Promise<ApiResponse<number>>;
  recalculateBalance(id: number): Promise<ApiResponse<number>>;
  recalculateAllBalances(): Promise<
    ApiResponse<{ [accountId: number]: number }>
  >;
}
