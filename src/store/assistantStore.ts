import { create } from 'zustand';

/** Whether the dashboard's "Ask AI" side panel is open (the Topbar button toggles it). */
interface AssistantUiState {
  open: boolean;
  expanded: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  toggleExpanded: () => void;
}

export const useAssistantUi = create<AssistantUiState>((set) => ({
  open: false,
  expanded: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
}));
