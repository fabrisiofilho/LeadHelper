import { type IDrawerItem } from './drawerItem';

export interface IDrawerSection {
  id: string;
  title: string;
  items: IDrawerItem[];
}
