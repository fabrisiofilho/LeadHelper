export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'credit' | 'debit' | 'pix' | 'cash';
export type ExpenseType = 'fixed' | 'variable';
export type Recurrence = 'once' | 'monthly' | 'weekly';
export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  transactionDate: Date;
  dueDate?: Date;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
  recurrence?: Recurrence;
  accountId: number;
  categoryId: number;
  creditCardInvoiceId?: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  transactionDate: Date;
  dueDate?: Date;
  totalInstallments?: number;
  recurrence?: Recurrence;
  accountId: number;
  categoryId: number;
}
export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  transactionDate?: Date;
  dueDate?: Date;
  categoryId?: number;
}
export type SortDirection = 'ASC' | 'DESC';
export type TransactionSortField =
  | 'transactionDate'
  | 'amount'
  | 'description'
  | 'type'
  | 'createdAt';
export interface SortConfig {
  field: TransactionSortField;
  direction: SortDirection;
}
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  categoryId?: number;
  accountId?: number;
  type?: TransactionType;
  page?: number;
  size?: number;
  sort?: SortConfig;
}
export interface CategoryExpense {
  categoryId: number;
  categoryName: string;
  categoryIcon?: string;
  totalAmount: number;
  percentage: number;
}
export interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: CategoryExpense[];
}
