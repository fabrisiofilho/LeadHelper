import { Transaction } from './transaction.types';
import type { CardBrand } from './account.types';

export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue';
export interface CreditCardInvoice {
  id: number;
  accountId: number;
  accountName?: string;
  year: number;
  month: number;
  totalAmount: number;
  dueDate: Date;
  status: InvoiceStatus;
  paidAt?: Date;
  paymentAccountId?: number;
  paymentAccountName?: string;
  transactions?: InvoiceTransaction[];
  createdAt: Date;
  updatedAt: Date;
}
export interface InvoiceTransaction extends Transaction {
  categoryName?: string;
  categoryIcon?: string;
}
export interface CreditCardSummary {
  accountId: number;
  accountName: string;
  creditLimit: number;
  usedLimit: number;
  availableLimit: number;
  usedPercentage: number;
  closingDay: number;
  dueDay?: number;
  cardColor?: string;
  cardBrand?: CardBrand;
  bankName?: string;
  currentInvoice?: CreditCardInvoice;
  nextDueInvoice?: CreditCardInvoice;
}
export interface PayInvoiceInput {
  invoiceId: number;
  paymentAccountId: number;
  amount?: number;
}
export interface InvoiceFilters {
  accountId?: number;
  year?: number;
  month?: number;
  status?: InvoiceStatus;
}
export interface PayInvoiceResult {
  invoice: CreditCardInvoice;
  amountPaid: number;
  paymentAccountBalance: number;
}
