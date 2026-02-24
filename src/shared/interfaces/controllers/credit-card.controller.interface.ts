import { ApiResponse } from '../types/common.types';
import {
  CreditCardInvoice,
  CreditCardSummary,
  InvoiceFilters,
  PayInvoiceInput,
  PayInvoiceResult,
} from '../types/credit-card.types';
export interface ICreditCardController {
  getInvoices(
    filters?: InvoiceFilters,
  ): Promise<ApiResponse<CreditCardInvoice[]>>;
  getInvoiceDetails(invoiceId: number): Promise<ApiResponse<CreditCardInvoice>>;
  payInvoice(data: PayInvoiceInput): Promise<ApiResponse<PayInvoiceResult>>;
  getCreditCardsSummary(): Promise<ApiResponse<CreditCardSummary[]>>;
  getCreditCardSummary(
    accountId: number,
  ): Promise<ApiResponse<CreditCardSummary>>;
  closeCurrentInvoice(
    accountId: number,
  ): Promise<ApiResponse<CreditCardInvoice>>;
}
