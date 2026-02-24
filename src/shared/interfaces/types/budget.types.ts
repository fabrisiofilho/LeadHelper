export interface Budget {
  id: number;
  userId: number;
  categoryId: number;
  categoryName?: string;
  categoryIcon?: string;
  year: number;
  month: number;
  plannedAmount: number;
  spentAmount?: number;
  remainingAmount?: number;
  percentUsed?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetInput {
  categoryId: number;
  year: number;
  month: number;
  plannedAmount: number;
}

export interface UpdateBudgetInput {
  plannedAmount?: number;
}

export interface BudgetFilters {
  year?: number;
  month?: number;
  categoryId?: number;
}

export interface BudgetSummary {
  year: number;
  month: number;
  totalPlanned: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentUsed: number;
  budgets: Budget[];
  categoriesWithoutBudget: {
    categoryId: number;
    categoryName: string;
    spent: number;
  }[];
}

export interface BudgetComparison {
  categoryId: number;
  categoryName: string;
  months: {
    year: number;
    month: number;
    planned: number;
    spent: number;
    variance: number;
  }[];
}

export interface BudgetAlert {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  plannedAmount: number;
  spentAmount: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
}
