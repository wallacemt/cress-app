import { create } from "zustand";

export interface WorkspaceLayoutState {
  panelCount: number;
  groupCount: number;
  setPanelCount: (n: number) => void;
  setGroupCount: (n: number) => void;
}

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>()((set) => ({
  panelCount: 0,
  groupCount: 0,
  setPanelCount: (n) => set({ panelCount: n }),
  setGroupCount: (n) => set({ groupCount: n }),
}));
