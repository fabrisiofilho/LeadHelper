export type AlertStatus = 'ok' | 'warning' | 'critical';
export interface Alert {
  id: number;
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface AlertWithStatus {
  alertId: number;
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  currentSpent: number;
  percentage: number;
  status: AlertStatus;
}
export interface CreateAlertInput {
  categoryId: number;
  limitAmount: number;
}
export interface UpdateAlertInput {
  categoryId?: number;
  limitAmount?: number;
  isActive?: boolean;
}
