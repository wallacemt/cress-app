import { createContext, useContext } from "react";

export interface UpdateCheckState {
  status: "idle" | "checking" | "available" | "none" | "error";
  check: () => Promise<void>;
  install: () => Promise<void>;
  installing: boolean;
  progress: number | null;
  version: string | null;
}

export const UpdateContext = createContext<UpdateCheckState | null>(null);

export function useUpdateCheck() {
  const value = useContext(UpdateContext);
  if (!value) throw new Error("useUpdateCheck must be used within UpdateCheckProvider");
  return value;
}
