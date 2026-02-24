type CountConfig = {
  number: number;
  bgcolor: string;
  color: string;
  loading?: boolean;
};

export interface IListTableTabConfig {
  id: string;
  title: string;
  borderColor: string;
  countConfig?: CountConfig;
  hasBadge?: boolean;
  badgeColor?:
    | 'error'
    | 'default'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning';
}
