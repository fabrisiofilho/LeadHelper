import { TransactionType, CategoryExpense } from './transaction.types';
export type ExportFormat = 'csv' | 'pdf';
export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  categoryId?: number;
  accountId?: number;
  type?: TransactionType;
}
export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  expensesByCategory: CategoryExpense[];
}
export interface ReportData {
  filters: ReportFilters;
  summary: ReportSummary;
  generatedAt: Date;
}
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeader?: boolean;
  includeSummary?: boolean;
}
export interface ExportResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  fileSize?: number;
  errorMessage?: string;
}
export interface IncomeVsExpense {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
}
