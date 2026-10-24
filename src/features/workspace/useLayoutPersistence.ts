import { useEffect } from "react";
import type { DockviewReadyEvent } from "dockview-react";
import { saveLayout } from "../../application/workspace";
import type { Deps } from "../../application/deps";

export function useLayoutPersistence(
  api: DockviewReadyEvent["api"] | null,
  deps: Deps | null,
  pieceId?: string,
) {
  useEffect(() => {
    if (!api || !deps) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () =>
      void saveLayout(deps, { pieceId }, api.toJSON()).catch((error) =>
        console.warn("Não foi possível salvar o layout do Workspace.", error),
      );
    const subscription = api.onDidLayoutChange(() => {
      clearTimeout(timer);
      timer = setTimeout(save, 500);
    });
    return () => {
      subscription.dispose();
      if (timer) {
        clearTimeout(timer);
        save();
      }
    };
  }, [api, deps, pieceId]);
}
