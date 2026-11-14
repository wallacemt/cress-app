import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UpdateContext, type UpdateCheckState } from "../../hooks/useUpdateCheck";
import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";

type Update = {
  version: string;
  downloadAndInstall: (onEvent: (event: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => Promise<void>;
};
type Status = UpdateCheckState["status"];
const inTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function UpdateCheckProvider({ children }: { children: ReactNode }) {
  const language = useLanguageStore((state) => state.language);
  const [status, setStatus] = useState<Status>("idle");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const update = useRef<Update | null>(null);
  const checking = useRef(false);
  const installingRef = useRef(false);

  const check = async () => {
    if (!inTauri() || checking.current) return;
    checking.current = true;
    setStatus("checking");
    try {
      const { check: checkForUpdate } = await import("@tauri-apps/plugin-updater");
      update.current = await checkForUpdate() as Update | null;
      setStatus(update.current ? "available" : "none");
    } catch (error) {
      console.warn("[updates] Check failed:", error);
      setStatus("error");
    } finally {
      checking.current = false;
    }
  };

  const install = async () => {
    if (!update.current || installingRef.current) return;
    installingRef.current = true;
    setInstalling(true);
    setProgress(0);
    let total = 0;
    let downloaded = 0;
    try {
      await update.current.downloadAndInstall((event) => {
        if (event.event === "Started") total = Number(event.data?.contentLength ?? 0);
        if (event.event === "Progress") {
          downloaded += Number(event.data?.chunkLength ?? 0);
          if (total > 0) setProgress(Math.min(100, Math.round(downloaded / total * 100)));
        }
        if (event.event === "Finished") setProgress(100);
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      setInstalling(false);
      installingRef.current = false;
      setProgress(null);
      toast.error(t("updates.install_error"));
      console.error("[updates] Install failed:", error);
    }
  };

  useEffect(() => {
    void check();
    if (!inTauri()) return;
    void import("@tauri-apps/api/app").then(({ getVersion }) => getVersion()).then(setVersion).catch((error: unknown) => { console.warn("[updates] getVersion failed:", error); });
  }, []);
  useEffect(() => {
    if (status !== "available" || !update.current) {
      toast.dismiss("cress-update");
      return;
    }
    toast(installing
      ? progress === null ? t("updates.downloading") : t("updates.downloading_progress", { progress: String(progress) })
      : t("updates.available", { version: update.current.version }), {
      id: "cress-update",
      duration: Infinity,
      action: installing ? undefined : { label: t("updates.update_action"), onClick: () => void install() },
    });
  }, [status, installing, progress, language]);

  const value = useMemo(() => ({ status, check, install, installing, progress, version }), [status, installing, progress, version]);
  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}
