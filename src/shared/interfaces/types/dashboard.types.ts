import {
  MonthSummary,
  CategoryExpense,
  Transaction,
} from './transaction.types';
import { Account } from './account.types';
export type { MonthSummary, CategoryExpense };
export interface IncomeVsExpense {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
}
export interface UpcomingBill {
  id: number;
  description: string;
  amount: number;
  dueDate: Date;
  categoryId: number;
  categoryName: string;
  categoryIcon?: string;
  accountId: number;
  accountName: string;
  isOverdue: boolean;
  daysUntilDue: number;
}
export interface AccountBalance {
  id: number;
  name: string;
  type: Account['type'];
  balance: number;
  creditLimit?: number;
  availableLimit?: number;
  usedLimitPercentage?: number;
  isNegative: boolean;
}
export interface DashboardFilters {
  year?: number;
  month?: number;
  accountId?: number;
}
export interface DashboardData {
  totalBalance: number;
  projectedBalance: number;
  monthSummary: MonthSummary;
  expensesByCategory: CategoryExpense[];
  incomeVsExpenses: IncomeVsExpense[];
  recentTransactions: Transaction[];
  upcomingBills: UpcomingBill[];
  accountBalances: AccountBalance[];
  lastUpdated: Date;
}
export interface DashboardResponse {
  data: DashboardData;
  filters: DashboardFilters;
}
