import {
  getLocalStorageItem,
  setLocalStorageItem,
} from '@renderer/utils/localStorage';

const DRAWER_KEY = '@drawer/compacted';
const SECTIONS_KEY = '@drawer/expandedSections';

export const drawerStorage = {
  setDrawerCompacted: (compacted: boolean) => {
    setLocalStorageItem(DRAWER_KEY, compacted);
  },
  getDrawerCompacted: () => !!getLocalStorageItem(DRAWER_KEY),

  setExpandedSections: (sections: string[]) => {
    setLocalStorageItem(SECTIONS_KEY, sections);
  },
  getExpandedSections: (): string[] => {
    const stored = getLocalStorageItem(SECTIONS_KEY);
    // Default: all sections expanded
    return stored ?? ['general', 'system'];
  },
};
