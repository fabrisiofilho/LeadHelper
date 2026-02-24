import {
  TransactionType,
  PaymentMethod,
  ExpenseType,
} from './transaction.types';

export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly';

export interface RecurringTransaction {
  id: number;
  userId: number;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  accountId: number;
  accountName?: string;
  categoryId: number;
  categoryName?: string;
  categoryIcon?: string;
  startDate: Date;
  endDate?: Date;
  nextOccurrence: Date;
  lastGenerated?: Date;
  isActive: boolean;
  autoConfirm: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecurringTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  accountId: number;
  categoryId: number;
  startDate: Date;
  endDate?: Date;
  autoConfirm?: boolean;
}

export interface UpdateRecurringTransactionInput {
  description?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  frequency?: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  accountId?: number;
  categoryId?: number;
  endDate?: Date;
  isActive?: boolean;
  autoConfirm?: boolean;
}

export interface RecurringTransactionFilters {
  type?: TransactionType;
  frequency?: RecurringFrequency;
  accountId?: number;
  categoryId?: number;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface GeneratedTransaction {
  recurringId: number;
  transactionId: number;
  description: string;
  amount: number;
  date: Date;
  isConfirmed: boolean;
}

export interface RecurringGenerationResult {
  generated: GeneratedTransaction[];
  errors: { recurringId: number; error: string }[];
  nextRun: Date;
}
