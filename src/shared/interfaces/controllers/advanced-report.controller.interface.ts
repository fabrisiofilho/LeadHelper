import type { ApiResponse } from '../types/common.types';

export interface YearComparison {
  category: string;
  categoryId: number;
  currentYear: number;
  previousYear: number;
  variation: number;
  variationPercent: number;
}

export interface TrendAnalysis {
  categoryId: number;
  categoryName: string;
  months: { year: number; month: number; amount: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  averageMonthly: number;
  projectedNextMonth: number;
}

export interface SpendingPattern {
  dayOfWeek: number;
  dayName: string;
  averageSpending: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  categoryIcon?: string;
  total: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface FinancialHealth {
  score: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  budgetAdherence: number;
  emergencyFundMonths: number;
  recommendations: string[];
}

export interface AdvancedReportFilters {
  startDate: Date;
  endDate: Date;
  accountId?: number;
  categoryIds?: number[];
}

export interface IAdvancedReportController {
  yearComparison(year: number): Promise<ApiResponse<YearComparison[]>>;
  trendAnalysis(months?: number): Promise<ApiResponse<TrendAnalysis[]>>;
  spendingPatterns(
    filters?: AdvancedReportFilters,
  ): Promise<ApiResponse<SpendingPattern[]>>;
  categoryBreakdown(
    filters: AdvancedReportFilters,
  ): Promise<ApiResponse<CategoryBreakdown[]>>;
  financialHealth(): Promise<ApiResponse<FinancialHealth>>;
  incomeVsExpenseHistory(months?: number): Promise<
    ApiResponse<
      {
        year: number;
        month: number;
        income: number;
        expense: number;
        balance: number;
      }[]
    >
  >;
}
