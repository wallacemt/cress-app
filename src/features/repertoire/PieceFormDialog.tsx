import { useState, type FormEvent } from "react";
import {
  createPiece,
  updatePiece,
  type PieceInput,
} from "../../application/repertoire";
import { container } from "../../app/container";
import { INSTRUMENTS, type InstrumentCode } from "../../domain/profile";
import type { RepertoireItem } from "../../domain/repertoire";

const control =
  "rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-tint)]";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-not-allowed disabled:opacity-45";

export function PieceFormDialog({
  piece,
  onClose,
  onSaved,
}: {
  piece?: RepertoireItem;
  onClose: () => void;
  onSaved: (piece: RepertoireItem) => void;
}) {
  const [title, setTitle] = useState(piece?.title ?? "");
  const [composer, setComposer] = useState(piece?.composer ?? "");
  const [movement, setMovement] = useState(piece?.movement ?? "");
  const [instrument, setInstrument] = useState<InstrumentCode | "">(
    piece?.instrument ?? "",
  );
  const [notes, setNotes] = useState(piece?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) return setError("Informe o título da obra.");
    setSaving(true);
    const input: PieceInput = {
      title: title.trim(),
      composer: composer.trim() || null,
      movement: movement.trim() || null,
      instrument: instrument || null,
      notes: notes.trim() || null,
    };
    try {
      const deps = await container.getDeps();
      const saved = piece
        ? await updatePiece(deps, { ...input, id: piece.id })
        : await createPiece(deps, input);
      onSaved(saved);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a obra.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="piece-form-title"
        className="w-full max-w-xl rounded-xl border border-[var(--border-default)] bg-[var(--ink-900)] p-6 text-[var(--text-primary)] shadow-2xl"
      >
        <h2 id="piece-form-title" className="font-display text-3xl">
          {piece ? "Editar obra" : "Adicionar obra"}
        </h2>
        <form className="mt-6 space-y-4" onSubmit={save}>
          <label className="block text-sm text-[var(--text-secondary)]">
            Título *
            <input
              autoFocus
              required
              aria-label="Título"
              className={`${control} mt-2 h-11 w-full`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm text-[var(--text-secondary)]">
            Compositor
            <input
              aria-label="Compositor"
              className={`${control} mt-2 h-11 w-full`}
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
            />
          </label>
          <label className="block text-sm text-[var(--text-secondary)]">
            Movimento
            <input
              aria-label="Movimento"
              className={`${control} mt-2 h-11 w-full`}
              value={movement}
              onChange={(e) => setMovement(e.target.value)}
            />
          </label>
          <label className="block text-sm text-[var(--text-secondary)]">
            Instrumento
            <select
              aria-label="Instrumento"
              className={`${control} mt-2 h-11 w-full`}
              value={instrument}
              onChange={(e) =>
                setInstrument(e.target.value as InstrumentCode | "")
              }
            >
              <option value="">Nenhum</option>
              {Object.entries(INSTRUMENTS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--text-secondary)]">
            Notas
            <textarea
              aria-label="Notas"
              className={`${control} mt-2 min-h-24 w-full py-3`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className={`${button} border border-[var(--border-default)] text-[var(--text-secondary)]`}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}
            >
              {saving ? "Salvando…" : "Salvar obra"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
