import { t } from "../../../lib/i18n";
import { useLanguageStore } from "../../../stores/languageStore";
import { useEffect, useRef, useState } from "react";
import { useAudioInputStore } from "../../../stores/audioInputStore";

export function AudioDeviceSelector() {
  useLanguageStore((state) => state.language);
  const devices = useAudioInputStore((state) => state.devices);
  const deviceId = useAudioInputStore((state) => state.deviceId);
  const acquire = useAudioInputStore((state) => state.acquire);
  const release = useAudioInputStore((state) => state.release);
  const loadDevices = useAudioInputStore((state) => state.loadDevices);
  const setDevice = useAudioInputStore((state) => state.setDevice);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadDevices().catch(() => { if (active) setError(true); });
    void acquire().catch(() => { if (active) setError(true); });
    return () => { active = false; void release().catch(() => {}); };
  }, [acquire, loadDevices, release]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [menuOpen]);

  return (
    <div className="cress-tuner-device">
      <label htmlFor="cress-audio-device-button">{t("workspace.input_audio")}</label>
      <div ref={menu} className="cress-tuner-device-menu">
        <button id="cress-audio-device-button" type="button" aria-haspopup="listbox" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {devices.find((device) => device.id === deviceId)?.name ?? t("workspace.system_default")}
        </button>
        {menuOpen && <div role="listbox" aria-label={t("workspace.input_audio")} className="cress-menu-popover cress-tuner-device-options">
          {[{ id: "", name: t("workspace.system_default"), isDefault: false }, ...devices].map((device) => <button key={device.id || "default"} type="button" role="option" aria-selected={(deviceId ?? "") === device.id} className={(deviceId ?? "") === device.id ? "is-selected" : ""} onClick={() => { void setDevice(device.id || null).catch(() => setError(true)); setMenuOpen(false); }}>{device.name}{device.isDefault ? ` ${t("workspace.default_suffix")}` : ""}</button>)}
        </div>}
      </div>
      {error && <span role="status">{t("workspace.audio_input_error")}</span>}
    </div>
  );
}
