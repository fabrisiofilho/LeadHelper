import type {
  Notification,
  NotificationFilters,
  NotificationSummary,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '../types/notification.types';
import type { ApiResponse } from '../types/api.types';

export interface INotificationController {
  findAll(filters?: NotificationFilters): Promise<ApiResponse<Notification[]>>;
  getSummary(): Promise<ApiResponse<NotificationSummary>>;
  markAsRead(id: number): Promise<ApiResponse<void>>;
  markAllAsRead(): Promise<ApiResponse<void>>;
  dismiss(id: number): Promise<ApiResponse<void>>;
  delete(id: number): Promise<ApiResponse<void>>;
  getSettings(): Promise<ApiResponse<NotificationSettings>>;
  updateSettings(
    input: UpdateNotificationSettingsInput,
  ): Promise<ApiResponse<NotificationSettings>>;
  processScheduled(): Promise<ApiResponse<number>>;
}
