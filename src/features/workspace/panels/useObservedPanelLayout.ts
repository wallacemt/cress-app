import { useEffect, useState, type RefObject } from "react";

/** Breakpoints follow the panel-level sizes implied by the workspace CSS. */
export const PANEL_COMPACT_MAX_WIDTH = 420;
export const PANEL_COMPACT_MAX_HEIGHT = 380;
export const PANEL_LARGE_MIN_WIDTH = 650;
export const PANEL_LARGE_MIN_HEIGHT = 420;

export function useObservedPanelLayout(
  root: RefObject<HTMLElement | null>,
): string {
  const [layoutClass, setLayoutClass] = useState("");

  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setLayoutClass(
        width <= PANEL_COMPACT_MAX_WIDTH || height <= PANEL_COMPACT_MAX_HEIGHT
          ? "cress-layout-quad"
          : width >= PANEL_LARGE_MIN_WIDTH && height >= PANEL_LARGE_MIN_HEIGHT
            ? "cress-layout-duo"
            : "",
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);

  return layoutClass;
}
