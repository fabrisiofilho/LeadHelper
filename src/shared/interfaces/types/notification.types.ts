export type NotificationType =
  | 'bill_due'
  | 'budget_exceeded'
  | 'goal_reached'
  | 'recurring_generated'
  | 'low_balance'
  | 'invoice_closing'
  | 'custom';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  referenceType?: string;
  referenceId?: number;
  isRead: boolean;
  isDismissed: boolean;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  referenceType?: string;
  referenceId?: number;
  scheduledAt?: Date;
}

export interface NotificationSettings {
  id: number;
  userId: number;
  billDueEnabled: boolean;
  billDueDaysBefore: number;
  budgetExceededEnabled: boolean;
  budgetThresholdPercent: number;
  goalReachedEnabled: boolean;
  recurringGeneratedEnabled: boolean;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: number;
  invoiceClosingEnabled: boolean;
  invoiceClosingDaysBefore: number;
  soundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNotificationSettingsInput {
  billDueEnabled?: boolean;
  billDueDaysBefore?: number;
  budgetExceededEnabled?: boolean;
  budgetThresholdPercent?: number;
  goalReachedEnabled?: boolean;
  recurringGeneratedEnabled?: boolean;
  lowBalanceEnabled?: boolean;
  lowBalanceThreshold?: number;
  invoiceClosingEnabled?: boolean;
  invoiceClosingDaysBefore?: number;
  soundEnabled?: boolean;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  size?: number;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: { type: NotificationType; count: number }[];
  byPriority: { priority: NotificationPriority; count: number }[];
}

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
  actions?: { type: string; text: string }[];
}
