import { drawerStorage } from '@renderer/localStorage/drawerStorage';
import { createSlice } from '@reduxjs/toolkit';

type Drawer = {
  compacted: boolean;
};

const initialState: Drawer = {
  compacted: drawerStorage.getDrawerCompacted(),
};

export const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    openDrawer(state) {
      drawerStorage.setDrawerCompacted(false);

      return { ...state, compacted: false };
    },
    closeDrawer(state) {
      drawerStorage.setDrawerCompacted(true);

      return { ...state, compacted: true };
    },
  },
});

export const { openDrawer, closeDrawer } = drawerSlice.actions;
