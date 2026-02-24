import type {
  Currency,
  CreateCurrencyInput,
  UpdateCurrencyInput,
  CurrencyConversion,
} from '../types/currency.types';
import type { ApiResponse } from '../types/api.types';

export interface ICurrencyController {
  create(input: CreateCurrencyInput): Promise<ApiResponse<Currency>>;
  update(
    id: number,
    input: UpdateCurrencyInput,
  ): Promise<ApiResponse<Currency>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findAll(): Promise<ApiResponse<Currency[]>>;
  findByCode(code: string): Promise<ApiResponse<Currency>>;
  getDefault(): Promise<ApiResponse<Currency>>;
  setDefault(id: number): Promise<ApiResponse<Currency>>;
  convert(
    fromCode: string,
    toCode: string,
    amount: number,
  ): Promise<ApiResponse<CurrencyConversion>>;
  updateRates(): Promise<ApiResponse<Currency[]>>;
}
