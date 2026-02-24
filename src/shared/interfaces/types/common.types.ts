export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export enum FilterTypeEnum {
  SEARCH = 'SEARCH',
  FILTER_CUSTOM = 'FILTER_CUSTOM',
  FILTER_IN_IDS = 'FILTER_IN_IDS',
  FILTER_IN_VALUES = 'FILTER_IN_VALUES',
}

export interface Sort {
  property: string;
  direction: 'ASC' | 'DESC';
}

export interface Filter {
  properties: string[];
  values: string[];
  type: FilterTypeEnum;
}

export interface PaginationOptions {
  page?: number;
  size?: number;
  sorts?: Sort[];
  filters?: Filter[];
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
