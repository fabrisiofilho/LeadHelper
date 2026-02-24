export interface CashFlowProjection {
  date: Date;
  projectedBalance: number;
  income: number;
  expenses: number;
  transfers: number;
  details: CashFlowDetail[];
}

export interface CashFlowDetail {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  source: 'transaction' | 'recurring' | 'bill';
  description: string;
  amount: number;
  date: Date;
  accountId: number;
  accountName: string;
  categoryId?: number;
  categoryName?: string;
  isConfirmed: boolean;
  isPast: boolean;
}

export interface CashFlowFilters {
  accountId?: number;
  startDate: Date;
  endDate: Date;
  includeRecurring?: boolean;
  includePendingBills?: boolean;
}

export interface CashFlowSummary {
  currentBalance: number;
  projectedBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  projections: CashFlowProjection[];
  alerts: CashFlowAlert[];
}

export interface CashFlowAlert {
  date: Date;
  type: 'negative_balance' | 'low_balance' | 'large_expense';
  message: string;
  projectedBalance: number;
  threshold?: number;
}

export interface MonthlyProjection {
  year: number;
  month: number;
  startingBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  confidence: number; // Based on historical accuracy
}

export interface CashFlowReport {
  filters: CashFlowFilters;
  summary: CashFlowSummary;
  monthlyProjections: MonthlyProjection[];
  generatedAt: Date;
}
