import type { ApiResponse } from '../types/common.types';
import type {
  CashFlowSummary,
  CashFlowFilters,
  MonthlyProjection,
} from '../types/cash-flow.types';

export interface ICashFlowController {
  getProjection(
    filters: CashFlowFilters,
  ): Promise<ApiResponse<CashFlowSummary>>;
  getMonthlyProjections(
    months?: number,
  ): Promise<ApiResponse<MonthlyProjection[]>>;
}
