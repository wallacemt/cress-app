import { useState, type FormEvent } from "react";
import { validateBpm } from "../../domain/bpm";

export function FinishSessionDialog({ initialBpm, notes, hasGoal, onCancel, onConfirm }: {
  initialBpm: number | null; notes: string; hasGoal: boolean;
  onCancel: () => void; onConfirm: (data: { finalBpm: number | null; notes: string; completeGoal: boolean }) => void;
}) {
  const [bpm, setBpm] = useState(initialBpm == null ? "" : String(initialBpm));
  const [text, setText] = useState(notes);
  const [completeGoal, setCompleteGoal] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (text.length > 2000) throw new Error("Observações muito longas.");
      onConfirm({ finalBpm: bpm ? validateBpm(Number(bpm)) : null, notes: text, completeGoal });
    }
    catch { setError(text.length > 2000 ? "Use até 2.000 caracteres nas observações." : "Informe um BPM inteiro entre 20 e 300."); }
  }
  return <div className="session-dialog-backdrop"><form className="session-dialog" onSubmit={submit} aria-label="Finalizar sessão">
    <h2>Finalizar sessão</h2>
    <label>BPM final<input aria-label="BPM final" type="number" min="20" max="300" value={bpm} onChange={(event) => setBpm(event.target.value)} /></label>
    <label>Observações<textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} /></label>
    {hasGoal && <label className="session-dialog-check"><input type="checkbox" checked={completeGoal} onChange={(event) => setCompleteGoal(event.target.checked)} /> Objetivo concluído</label>}
    {error && <p role="alert">{error}</p>}
    <footer><button type="button" onClick={onCancel}>Cancelar</button><button type="submit">Confirmar</button></footer>
  </form></div>;
}
