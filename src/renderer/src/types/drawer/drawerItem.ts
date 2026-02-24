import { type ReactNode } from 'react';

export interface IDrawerSubItem {
  label: string;
  path: string;
  end: boolean;
  canAccess: boolean;
}

export interface IDrawerItem {
  icon: ReactNode;
  label: string;
  path: string;
  canAccess: boolean;

  subItems?: IDrawerSubItem[];
}
