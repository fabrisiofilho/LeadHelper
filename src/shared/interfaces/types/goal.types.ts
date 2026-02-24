export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  accountId?: number;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface GoalProgress {
  goalId: number;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
}
export interface GoalContribution {
  id: number;
  goalId: number;
  amount: number;
  contributionDate: Date;
  createdAt: Date;
}
export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  deadline?: Date;
  accountId?: number;
}
export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  deadline?: Date;
  accountId?: number;
}
export interface AddContributionInput {
  amount: number;
  contributionDate?: Date;
}
