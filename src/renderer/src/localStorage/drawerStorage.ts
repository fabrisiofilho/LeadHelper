import {
  getLocalStorageItem,
  setLocalStorageItem,
} from '@renderer/utils/localStorage';

const DRAWER_KEY = '@drawer/compacted';

export const drawerStorage = {
  setDrawerCompacted: (compacted: boolean) => {
    setLocalStorageItem(DRAWER_KEY, compacted);
  },
  getDrawerCompacted: () => !!getLocalStorageItem(DRAWER_KEY),
};
