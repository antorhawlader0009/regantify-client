import { create } from 'zustand';

const KEY = 'regantify.showAdvancedMenu';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Whether the sidebar also lists the "advanced" pages (see `advanced` in
 * lib/navConfig.ts). Off by default; one choice per browser. The pages are
 * never removed: Ctrl K, direct links and the page you are on always work.
 */
interface AdvancedMenuState {
  showAdvancedMenu: boolean;
  setShowAdvancedMenu: (value: boolean) => void;
}

export const useAdvancedMenu = create<AdvancedMenuState>((set) => ({
  showAdvancedMenu: read(),
  setShowAdvancedMenu: (value) => {
    try {
      localStorage.setItem(KEY, value ? '1' : '0');
    } catch {
      // storage blocked: the choice just lasts until the tab closes
    }
    set({ showAdvancedMenu: value });
  },
}));
