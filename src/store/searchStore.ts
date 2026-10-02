import { create } from 'zustand';

/** Whether the top-bar search palette is open (the Topbar field and Ctrl/Cmd+K toggle it). */
interface SearchUiState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useSearchUi = create<SearchUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
