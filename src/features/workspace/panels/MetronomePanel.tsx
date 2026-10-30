import { useEffect, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import {
  Minus,
  Plus,
  Play,
  Settings2,
  Square,
  Volume2,
  X,
  ChevronDown,
} from "lucide-react";
import {
  getTempoMarking,
  getTempoMarkingRange,
  SUBDIVISIONS,
  TEMPO_MARKING_MIDPOINTS,
} from "../../../domain/metronome";
import { changeBpm, validateBpm } from "../../../domain/bpm";
import { container } from "../../../app/container";
import {
  loadMetronomeConfig,
  saveMetronomeConfig,
} from "../../../application/metronome";
import { useMetronomeStore } from "../../../stores/metronomeStore";
import { Pendulum } from "../../metronome/Pendulum";

export function MetronomePanel({ params }: IDockviewPanelProps) {
  void params;
  const config = useMetronomeStore((state) => state.config);
  const running = useMetronomeStore((state) => state.running);
  const beat = useMetronomeStore((state) => state.beat);
  const setConfig = useMetronomeStore((state) => state.setConfig);
  const setBpm = useMetronomeStore((state) => state.setBpm);
  const toggle = useMetronomeStore((state) => state.toggle);
  const [editing, setEditing] = useState(false);
  const [bpmInput, setBpmInput] = useState(String(config.bpm));
  const [volume, setVolume] = useState(70);
  const [unit, setUnit] = useState<4 | 8>(4);
  const [configModal, setConfigModal] = useState(false);
  const [tempoOpen, setTempoOpen] = useState(false);
  const [tapBpm, setTapBpm] = useState(0);
  const [error, setError] = useState("");
  const root = useRef<HTMLElement>(null);
  const tempoMenu = useRef<HTMLDivElement>(null);
  const taps = useRef<number[]>([]);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const tapHandler = useRef<() => void>(() => {});

  useEffect(() => {
    if (!tempoOpen) return;
    const close = (event: MouseEvent) => {
      if (!tempoMenu.current?.contains(event.target as Node))
        setTempoOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTempoOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [tempoOpen]);
  useEffect(() => {
    let alive = true;
    void container
      .getDeps()
      .then(loadMetronomeConfig)
      .then((value) => {
        if (alive) setConfig(value);
      })
      .catch(() => setError("Não foi possível carregar a configuração."));
    return () => {
      alive = false;
    };
  }, [setConfig]);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () =>
        void container
          .getDeps()
          .then((deps) => saveMetronomeConfig(deps, config))
          .catch(() => setError("Não foi possível salvar a configuração.")),
      500,
    );
  }, [config]);
  useEffect(
    () => () => {
      clearTimeout(tapTimeout.current);
      clearTimeout(saveTimer.current);
      void container
        .getDeps()
        .then((deps) =>
          saveMetronomeConfig(deps, useMetronomeStore.getState().config),
        )
        .catch((cause) =>
          console.warn(
            "Não foi possível salvar a configuração do metrônomo.",
            cause,
          ),
        );
    },
    [],
  );
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      )
        return;
      if (
        event.key === " " &&
        !event.repeat &&
        root.current?.contains(event.target as Node)
      ) {
        if ((event.target as HTMLElement).closest?.(".dv-tab")) return;
        event.preventDefault();
        void toggle().catch((cause: unknown) => {
          console.error("Metrônomo: falha ao iniciar o áudio.", cause);
          setError("Não foi possível iniciar o áudio.");
        });
      }
      if (
        event.key.toLowerCase() === "t" &&
        root.current?.contains(event.target as Node)
      ) {
        event.preventDefault();
        tapHandler.current();
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const delta = event.shiftKey
          ? event.key === "ArrowUp"
            ? 5
            : -5
          : event.key === "ArrowUp"
            ? 1
            : -1;
        try {
          setBpm(changeBpm(config.bpm, delta));
        } catch {
          /* BPM limit */
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config.bpm, setBpm, toggle]);

  function tap() {
    const now = Date.now();
    taps.current = [
      ...taps.current.filter((time) => now - time <= 2000),
      now,
    ].slice(-5);
    if (taps.current.length > 1) {
      const value = Math.round(
        60000 / ((now - taps.current[0]!) / (taps.current.length - 1)),
      );
      setTapBpm(value);
      if (value >= 20 && value <= 300) setBpm(value);
    }
    clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => {
      taps.current = [];
      setTapBpm(0);
    }, 2000);
  }
  tapHandler.current = tap;
  function submitBpm() {
    try {
      setBpm(Number(bpmInput));
      setEditing(false);
      setError("");
    } catch {
      setError("Informe um BPM inteiro entre 20 e 300.");
    }
  }
  function update(patch: Partial<typeof config>) {
    setConfig({ ...config, ...patch });
  }
  const isBeat = (index: number) => running && index === beat - 1;
  const row = (
    <div className="cress-metronome-beat-row" aria-label="Tempos do compasso">
      {Array.from({ length: config.beatsPerBar }, (_, i) => (
        <span
          key={i}
          className={`${config.accentBeats.includes(i) ? "is-accented " : ""}${isBeat(i) ? "is-current" : ""}`}
        />
      ))}
    </div>
  );
  const bpm = (
    <div className="cress-metronome-metric">
      <span className="cress-metronome-label">BPM</span>
      {editing ? (
        <input
          autoFocus
          type="number"
          min="20"
          max="300"
          value={bpmInput}
          aria-label="BPM"
          onChange={(event) => setBpmInput(event.target.value)}
          onBlur={submitBpm}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitBpm();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          className="cress-metronome-number"
          type="button"
          aria-label={`BPM ${config.bpm}, editar`}
          onClick={() => {
            setBpmInput(String(config.bpm));
            setEditing(true);
          }}
        >
          {config.bpm}
        </button>
      )}
      <div ref={tempoMenu} className="cress-metronome-tempo">
        <button
          type="button"
          className="cress-metronome-marking flex items-center justify-center"
          aria-label={`Andamento ${getTempoMarking(config.bpm)}, escolher andamento`}
          aria-haspopup="menu"
          aria-expanded={tempoOpen}
          onClick={() => setTempoOpen(!tempoOpen)}
        >
          <p>{getTempoMarking(config.bpm)}</p>
          <ChevronDown />
        </button>
        {tempoOpen && (
          <div
            role="menu"
            aria-label="Andamento"
            className="cress-menu-popover cress-metronome-tempo-menu "
          >
            {Object.keys(TEMPO_MARKING_MIDPOINTS).map((name) => {
              const range = getTempoMarkingRange(
                name as keyof typeof TEMPO_MARKING_MIDPOINTS,
              );
              return (
                <button
                  key={name}
                  type="button"
                  role="menuitemradio"
                  aria-checked={getTempoMarking(config.bpm) === name}
                  className={
                    getTempoMarking(config.bpm) === name ? "is-selected" : ""
                  }
                  onClick={() => {
                    setBpm(
                      validateBpm(
                        TEMPO_MARKING_MIDPOINTS[
                          name as keyof typeof TEMPO_MARKING_MIDPOINTS
                        ],
                      ),
                    );
                    setTempoOpen(false);
                  }}
                >
                  {name}
                  <small>
                    {range[0]}–{range[1]} BPM
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
  const adjustment = (
    <div className="cress-metronome-adjust">
      {([-5, -1] as const).map((delta) => (
        <button
          key={delta}
          type="button"
          aria-label={`Diminuir ${Math.abs(delta)} BPM`}
          onClick={() => {
            try {
              setBpm(changeBpm(config.bpm, delta));
            } catch {
              /* BPM limit */
            }
          }}
        >
          <Minus size={12} />
          {Math.abs(delta)}
        </button>
      ))}
      <input
        aria-label="Ajustar BPM"
        type="range"
        min="20"
        max="300"
        value={config.bpm}
        onChange={(event) => setBpm(Number(event.target.value))}
      />
      {([1, 5] as const).map((delta) => (
        <button
          key={delta}
          type="button"
          aria-label={`Aumentar ${delta} BPM`}
          onClick={() => {
            try {
              setBpm(changeBpm(config.bpm, delta));
            } catch {
              /* BPM limit */
            }
          }}
        >
          <Plus size={12} />
          {delta}
        </button>
      ))}
    </div>
  );
  const play = (
    <button
      type="button"
      className="cress-metronome-play"
      aria-label={running ? "Parar metrônomo" : "Iniciar metrônomo"}
      onClick={() => {
        setError("");
        void toggle().catch((cause: unknown) => {
          console.error("Metrônomo: falha ao iniciar o áudio.", cause);
          setError("Não foi possível iniciar o áudio.");
        });
      }}
    >
      {running ? <Square size={24} /> : <Play size={24} />}
    </button>
  );
  const controls = (
    <>
      <div className="cress-metronome-section">
        <label>
          Tempos{" "}
          <input
            type="number"
            aria-label="Tempos por compasso"
            min="1"
            max="12"
            value={config.beatsPerBar}
            onChange={(event) => {
              const n = Number(event.target.value);
              if (n >= 1 && n <= 12) update({ beatsPerBar: n });
            }}
          />
        </label>
        <div className="cress-metronome-unit" aria-label="Unidade do compasso">
          {([4, 8] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={unit === n}
              onClick={() => setUnit(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <strong>
          {config.beatsPerBar}/{unit}
        </strong>
      </div>
      <div className="cress-metronome-section">
        <span className="cress-metronome-label">ACENTOS</span>
        <div className="cress-metronome-accents">
          {Array.from({ length: config.beatsPerBar }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Acento no tempo ${i + 1}`}
              aria-pressed={config.accentBeats.includes(i)}
              onClick={() => update({ accentBeats: config.accentBeats.includes(i) ? config.accentBeats.filter((b) => b !== i) : [...config.accentBeats, i] })}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="cress-metronome-section">
        <span className="cress-metronome-label">SUBDIVISÃO</span>
        <div className="cress-metronome-subdivisions">
          {SUBDIVISIONS.map((item) => (
            <button
              key={item}
              type="button"
              title={item
                .split("-")
                .map((x) => (x === "1" ? "Toca" : "Pausa"))
                .join(" · ")}
              aria-label={`Subdivisão ${item}`}
              aria-pressed={config.subdivision === item}
              onClick={() => update({ subdivision: item })}
            >
              {item.split("-").map((x, i) => (
                <i key={i} className={x === "1" ? "is-on" : ""} />
              ))}
            </button>
          ))}
        </div>
      </div>
      <label className="cress-metronome-volume">
        <Volume2 size={16} />
        <input
          aria-label="Volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
        <output>{volume}%</output>
      </label>
    </>
  );
  return (
    <section
      ref={root}
      tabIndex={0}
      className="cress-metronome-panel"
      aria-label="Painel Metrônomo"
      onClick={() => root.current?.focus({ preventScroll: true })}
    >
      {error && (
        <div className="cress-metronome-warning" role="alert">
          {error}
        </div>
      )}
      {row}
      <div className="cress-metronome-feature">
        <Pendulum />
        <div className="cress-metronome-main">{bpm}</div>
      </div>
      {adjustment}
      <button type="button" className="cress-metronome-tap" onClick={tap}>
        Tap{tapBpm ? ` · ${tapBpm}` : ""}
      </button>
      <button
        className="cress-metronome-details"
        type="button"
        onClick={() => setConfigModal(true)}
      >
        <Settings2 size={16} /> Configurações
      </button>
      <div className="cress-metronome-extra">{controls}</div>
      {configModal && (
        <div
          className="session-dialog-backdrop cress-metronome-config-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfigModal(false);
          }}
        >
          <section
            className="session-dialog cress-metronome-config-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Configurações do metrônomo"
          >
            <header>
              <h2>Configurações</h2>
              <button
                type="button"
                aria-label="Fechar configurações"
                onClick={() => setConfigModal(false)}
              >
                <X size={18} />
              </button>
            </header>
            {controls}
            <footer>
              <button type="button" onClick={() => setConfigModal(false)}>
                Concluir
              </button>
            </footer>
          </section>
        </div>
      )}
      <footer>{play}</footer>
    </section>
  );
}
