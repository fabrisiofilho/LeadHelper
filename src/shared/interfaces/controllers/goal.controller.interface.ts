import { ApiResponse } from '../types/common.types';
import {
  Goal,
  GoalProgress,
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
} from '../types/goal.types';
export interface IGoalController {
  create(data: CreateGoalInput): Promise<ApiResponse<Goal>>;
  update(id: number, data: UpdateGoalInput): Promise<ApiResponse<Goal>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Goal>>;
  findAll(): Promise<ApiResponse<Goal[]>>;
  addContribution(
    id: number,
    data: AddContributionInput,
  ): Promise<ApiResponse<Goal>>;
  getProgress(id: number): Promise<ApiResponse<GoalProgress>>;
}
