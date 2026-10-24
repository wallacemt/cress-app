# Milestone 1 — Spike de riscos

Validação feita em WSL/Linux. Build e execução de produção com WebView2/WASAPI ficam para Windows nativo.

- (a) ❌ confirmado quebrado — `spike-worklet.ts` carrega `click-processor.ts` via `?worker&url`, mas nesta instalação (Vite 8 sobre Rolldown) essa combinação não bundla/transpila o worklet: `vite build` copia o `.ts` bruto sem processar (confirmado inspecionando `dist/` real). O painel Metrônomo (Fase 6) bateu no mesmo bug em produção e teve que abandonar esse padrão por um bundle próprio via `rolldown` em `scripts/build-metronome-worklet.mjs` (ver `AGENTS.md` §8) — se este spike for revisitado, aplicar a mesma correção, não repetir `?worker&url`.
- (b) ⏳ bloqueado por WASAPI/microfone Windows — o command Rust de captura RMS ainda depende da implementação de áudio da Fase 7; não há evidência honesta nesta máquina.
- (c) 🔧 código pronto, falta validação manual no Windows — `SpikePage.tsx` usa `convertFileSrc` para WAV em recordings; falta arquivo real e asset protocol em `$APPDATA`.
- (d) ✅ confirmado aqui — `NodeSqliteDb` executa `PRAGMA foreign_keys = ON` e o teste rejeita INSERT com referência inexistente.
- (e) 🔧 código pronto, falta validação manual no Windows — dependência `dockview-react@8.4.1` instalada; persistência `toJSON/fromJSON` será exercitada quando o Workspace da Fase 5 existir.
- (f) 🔧 código pronto, falta validação manual no Windows — `pdfjs-dist@6.4.299`, assets copiados para `public/pdfjs` e CSP/asset protocol configurados; PDFs JPX/JBIG2 e console limpo exigem WebView2.
- (g) 🔧 código pronto, falta validação manual no Windows — `blocking_pick_folder` está registrado em um command `async`; diálogo nativo não pode ser exercitado no WSL.

Evidência automatizada disponível: `npm run test` confirma a FK no adaptador `node:sqlite`.
