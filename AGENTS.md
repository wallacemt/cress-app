# AGENTS.md — Cress

Regras e descobertas acumuladas para qualquer agente (ou pessoa) trabalhando neste repositório. Objetivo: nunca reconsultar/redescobrir algo que já está aqui.

## Regra permanente

**Toda descoberta nova relevante (decisão, correção de premissa, fato verificado sobre uma lib/API, armadilha evitada) entra neste arquivo antes de a tarefa ser considerada concluída.** Formato: bullet curto e factual, com a fonte. Não duplicar o que já está em `docs/` (Blueprint, Dossier, PRD, arch.md) — só o que não está lá ou corrige o que está lá.

**Mantenha este arquivo compacto.** Registre apenas decisões/armadilhas que afetam trabalho futuro — não narrativa de depuração, não histórico resolvido de uma sessão específica. Ao fechar uma milestone, revise e corte o que não é mais acionável.

---

## 1. Onde está cada coisa

- Código: `cress-app/` — GitHub `wallacemt/cress-app`.
- Documentação de produto/arquitetura/design vive **fora deste repo**, em `../docs/`: `PRD.md`, `arch.md`, `briefing-design.md`, `blueprints/The-Blueprint-001.md`, `dossiers/Dossier-de-Creation-001.md` + `design-tokens.json`. Referências em issues/PRs do GitHub são textuais (seção/ADR), nunca links de arquivo.
- 12 milestones no GitHub mapeando as 11 fases do Blueprint-001 + uma 12ª ("Distribuição — Store", fora do MVP, ADR-20). Não recriar — editar as existentes.
- Caso de sucesso de referência para MSIX/distribuição: `../CRITIX/critix_vault_desktop/` (app Tauri já publicado em produção).

## 2. Stack e versões travadas (Blueprint-001 §4) — não atualizar sem motivo forte

| Camada | Lib | Versão |
|---|---|---|
| Desktop | `tauri` / `tauri-build` | 2.12.1 / 2.7.1 |
| CLI/API | `@tauri-apps/cli` / `@tauri-apps/api` | 2.12.1 / 2.12.1 |
| DB | `tauri-plugin-sql` | 2.5.0 |
| Dialogs | `tauri-plugin-dialog` (só Rust) | 2.8.1 |
| Áudio | `cpal` | **=0.18.2** fixo (0.19 troca `play()`→`start()`) |
| Ring buffer / WAV / Hash | `rtrb` / `hound` / `sha2` | 0.4.0 / 3.5.1 / 0.11.0 |
| UI | `react`/`react-dom` | 19.3.0 |
| Build | `vite` | 8.3.3 |
| TS | `typescript` | 6.0.3 (travado por `typescript-eslint` exigir `<6.1.0`) |
| CSS | `tailwindcss` | 4.3.3 |
| Docking | `dockview-react` | 8.4.1 |
| PDF | `pdfjs-dist` | 6.4.299 |
| Rotas | `react-router` | 8.4.0 (`createHashRouter`) |
| Estado | `zustand` | 5.0.15 (só runtime, nunca fonte de verdade persistida) |

Regra: `-E`/exato sempre. Versão indisponível → parar e reportar, nunca aceitar `^` próximo.

## 3. Decisões arquiteturais fixadas (não reabrir sem novo fato)

- Domínio e aplicação só em TypeScript; Rust é só áudio nativo + arquivos (ADR-01).
- `StudySession`: `ACTIVE ⇄ PAUSED → FINISHED` (ADR-06).
- Nenhum caminho absoluto de arquivo cruza o webview; diálogos são abertos pelo Rust (ADR-17).
- Importação de partituras agrupa por nome-base **dentro do mesmo diretório**, nunca entre diretórios (ADR-18, algoritmo já implementado, não reimplementar).
- Workspace via `dockview-react`; popout nativo desligado deliberadamente (ADR-14).
- `identifier`/`publisher` do Tauri são imutáveis a partir da primeira publicação (ADR-20).
- Ambiente oficial de `tauri dev`/`build` é Windows nativo, nunca WSL (ADR-04) — áudio/cpal não funciona igual no WSLg.

## 4. Decisões de processo com o usuário

- Nunca atribuição de IA em commits/issues/PRs (regra do `CLAUDE.md` global do usuário).
- Design aprovado até "03 · Dashboard — Nav F (atril)" com efeito glass (Dossier §8.13.1) — não reabrir alternativas de navegação sem pedido explícito.
- Cada milestone/issue roda em branch separada a partir de `main` atualizada, PR de volta pra `main` ao concluir — nunca commitar direto em `main`.
- Padrão alternativo já usado (Milestones 5 e 6, a pedido do usuário): uma única branch `milestone-<NN>/<slug>` para toda a milestone, um commit por issue terminando em `Closes #NN`, um PR único ao final (merge normal, nunca squash — perderia o vínculo `Closes` por commit). Ao delegar para Codex: **um `codex exec` por issue**, nunca várias no mesmo prompt; validar (`lint`+`typecheck`+`test`) e comitar antes de passar para a próxima.
- `gh issue create --milestone` espera o **título** da milestone, não o número.
- **Nunca confiar no resumo final da Codex sem validar de verdade.** Já aconteceu 3x na Milestone 6 dela reportar sucesso (ou dizer que não validou) e o código real ter bug: unidade errada (`/60000` em vez de `/1000` num cálculo de frames), 2 erros de typecheck não vistos, e um off-by-one de índice. Sempre rodar `typecheck`/`lint`/`test` você mesmo, ler a saída até o fim, e revisar o diff real antes de comitar.

## 5. Distribuição — MSIX (do caso real Critix Vault)

O Blueprint-001 assumia que a Store receberia um instalador Win32; na prática, o caminho funcional é gerar um `.msix` real:
1. `tauri build` com `msi` nos `bundle.targets`.
2. Extrair via `msiexec /a app.msi TARGETDIR=staging /qn` (só extrai, não instala).
3. Montar a pasta do pacote: arquivos extraídos + `Assets/` (ícones via `System.Drawing` do .NET) + `AppxManifest.xml` escrito à mão (não existe no scaffold do Tauri).
4. `makeappx.exe pack /d <pasta> /p saida.msix /o` (vem no Windows SDK).
5. **Não assinar localmente** — a Store assina na publicação. Certificado Authenticode só é necessário para distribuição fora da Store.
- Chave do `tauri-plugin-updater` (minisign) **não tem relação** com certificado Authenticode — mecanismos independentes, fácil de confundir.
- `tauri build` não gera `latest.json` do updater sozinho — só via `tauri-apps/tauri-action`, ou montar manualmente a partir dos `.sig`.
- Referências no Critix: `.github/workflows/msix-build.yml`, `scripts/build-msix.ps1`, `src-tauri/packaging/AppxManifest.xml`.

## 6. Limitações conhecidas deste ambiente (WSL, checkout em `/mnt/e` via 9p)

- `cargo check`/`test`/`clippy` falham aqui por falta de `libasound2-dev` (dependência Linux do `cpal`) — não é bug de código; precisa `sudo apt-get install -y libasound2-dev` uma vez. O CI do GitHub instala isso sozinho, então o lado Rust é verificável lá mesmo sem rodar aqui.
- O mount 9p é lento/não-atômico para pacotes com muitos arquivos pequenos e pode corromper `node_modules` sem erro visível — se lint/typecheck falharem com módulo ausente sem motivo aparente, `rm -rf node_modules && bun install` antes de depurar módulo a módulo.
- **Workers DOM do Vitest** (`*.dom.test.tsx`) frequentemente dão `Timeout waiting for worker to respond` nesta máquina (setup do jsdom é lento demais pro timeout de start, mais pressão de memória/swap). `bun run test -- --no-isolate` reduz isso (reaproveita o worker entre arquivos); mesmo assim, **repita o comando uma vez** antes de concluir que há falha real — é quase sempre esse padrão, não uma regressão. Não mudar o `isolate` padrão do projeto/CI por causa disso.
- **HMR do Vite não é confiável aqui** — edições em arquivos (visto em `router.tsx`, `.css`) podem não ser servidas por vários minutos mesmo com `mtime` atualizado. Ao validar visualmente, reinicie o `bun run dev` do zero em vez de confiar no HMR.
- Sem Playwright/MCP de browser funcional. Para validação visual real: `google-chrome --headless=new --disable-gpu --no-sandbox --remote-debugging-port=N --remote-allow-origins=*` + CDP via `websocket` Python (`Runtime.evaluate`) para medir DOM/CSS computado, não só screenshot. Rotas sob o loader `rootLoader`/`onboardingLoader` quebram em browser puro (`TauriSqlDb`/`invoke` indefinido fora do Tauri) — para inspecionar uma rota protegida, adicionar uma rota solta temporária fora da árvore `/` e remover antes de terminar.
- Build/runtime real do `src-tauri/` (áudio, dialog, etc.) só é confiável no Windows nativo — vários bugs já só apareceram lá (ex.: `blocking_pick_folder()` retorna `Option<FilePath>` direto, não `Result`; `plugins.sql.preload` é connection string, não caminho de arquivo).

## 7. Dockview React 8.4.1 — fatos da API real (confirmados no pacote instalado, não só na doc)

- `initialWidth`/`initialHeight` de `addPanel` são **pixels**, não porcentagem — se seu plano de layout usa porcentagem, converta usando `api.width`/`api.height` (propriedades reais medidas) antes de passar.
- `addPanel()` sem `position` empilha tudo como abas de um único grupo — nunca cria split. Para grid/split real, usar `position: {referencePanel, direction}`.
- Para customizar algo que vale para **todo** painel (ex. tab renderer), usar a prop `default*` (`defaultTabComponent`), não uma tabela de lookup (`tabComponents`) que precisa ser referenciada em cada `addPanel` — fácil esquecer um dos pontos de criação.
- `toJSON()` serializa como `grid.root`; ramos guardam filhos em `data`, folhas guardam `views` em `data` — sanitizador de layout salvo precisa tratar essa estrutura.
- `Position` em `moveTo` usa `top/bottom/left/right/center`, nunca `above/below`.
- Variáveis de tema seguem `dockview-react/dist/styles/dockview.css` exatamente (ex. `--dv-group-view-background-color`) — nomes sem `-color` não têm efeito.
- No Windows, `app.windows[].dragDropEnabled: true` (padrão do Tauri) intercepta o HTML5 Drag-and-Drop nativo do WebView2 antes de chegar ao DOM, quebrando o DnD do dockview. Setar `false` em `tauri.conf.json` se o app não usa drop de arquivo do Explorer em lugar nenhum. **Não revalidado em runtime real** (precisa rebuild+reinstall no Windows).

## 8. Armadilhas de runtime já confirmadas (evitar repetir)

- **Checksum de migration SQL:** `include_str!` embute o arquivo em tempo de compilação, e `tauri-plugin-sql`/sqlx grava um checksum na 1ª aplicação. Qualquer mudança de *bytes* (até CRLF↔LF) sem re-rodar a migration quebra o app com "migration was previously applied but has been modified". `.gitattributes` já força `eol=lf` nas migrations — qualquer outro arquivo embutido no Rust com checksum persistido precisa do mesmo tratamento.
- CSS com a mesma especificidade: a regra cujo `<style>` é injetado depois vence o empate, não a ordem no código-fonte. Ao sobrescrever CSS de uma lib importada tardiamente (ex. `dockview.css` importado dentro de um componente), pode precisar de `!important` mesmo com specificity igual.
- Container flex sem `min-height: 0` não encolhe abaixo da altura do conteúdo — causa de overflow de página que parece "scroll bug" mas é CSS flex básico.
- Para `AudioContext` iniciado por gesto do usuário, chame `resume()` antes de aguardar `audioWorklet.addModule()`; o carregamento pode consumir a ativação transitória do clique (revisão da cadeia `engine.ts`, Issue #38). Real, mas não era a causa principal do "sem som".
- CSP do Tauri sem `worker-src`/`child-src` cai em `script-src` por cascata — se `script-src` não incluir o esquema que serve o módulo (`asset:`), `audioWorklet.addModule()` é bloqueado. Corrigido com `worker-src 'self' asset: blob:;` e `asset:` em `script-src`. Real, mas também não era a causa principal.
- **Causa raiz real, confirmada inspecionando o `dist/` de um `bun run build` de verdade (não só lendo código):** `new URL("./processor.ts?worker&url", import.meta.url)` **não bundla nem transpila nada** neste projeto — o Vite instalado aqui é **Vite 8 sobre Rolldown** (bundler em Rust, não Rollup/esbuild clássico), e a combinação de query `?worker&url` não aciona o pipeline de build de worker nesse motor: o Rolldown-Vite só copia o arquivo `.ts` bruto (import sem extensão, sintaxe TS não removida) — ora inlinado como `data:video/mp2t;base64,...` (o `.ts` colide com o MIME de vídeo MPEG-TS!), ora emitido como um arquivo literal `.ts` sem processar. Em nenhum dos dois casos o navegador executa `registerProcessor(...)`, mas `addModule()` resolve sem lançar erro — por isso o sintoma era "sem som, depois um erro genérico de áudio", nunca um erro de sintaxe óbvio. **Correção:** parar de depender do import mágico do Vite para este arquivo. `scripts/build-metronome-worklet.mjs` usa a API programática do `rolldown` (já uma dependência transitiva do Vite 8, adicionada aqui como devDependency explícita) para bundlar `src/features/metronome/processor.ts` (TS puro, com imports de `src/domain/*`) num `.js` real e autossuficiente em `public/metronome-processor.js`; `package.json` roda isso via `predev`/`prebuild` (hooks de ciclo de vida do npm/bun, disparados automaticamente antes de `dev`/`build` — inclusive quando o Tauri chama `npm run dev`/`npm run build`). `engine.ts` carrega esse arquivo por um caminho estático simples (`audioWorklet.addModule("/metronome-processor.js")`), nunca mais via `import.meta.url`. O arquivo gerado é ignorado no git e no ESLint (como `public/pdfjs/`). **Se algum dia outro worklet/worker precisar do mesmo truque, repetir este padrão — não tentar `?worker&url` de novo neste projeto.**

## 9. Pendências conhecidas (não escondidas, aguardando validação/decisão)

- **AC-M7** (DnD do Workspace no Windows) e **AC-M1** (metrônomo 120 BPM / 5 min, janela minimizada, fechar painel não para o som) — ambas pendentes de validação manual no Windows real, não reproduzíveis no WSL. O bug de "sem som ao dar play" teve 3 rodadas de correção (ver §8); a 3ª (bundle próprio do worklet via rolldown) tem evidência muito mais forte, confirmada inspecionando o build real gerado, não só lida no código — mas **ainda não testada em hardware/WebView2 real**. Se persistir, usar o `console.error` já adicionado em `MetronomePanel.tsx` para ver a causa real.
- CSS: cuidado ao usar tokens de `--ink-*` de cabeça — só `--ink-600` a `--ink-950` existem em `index.css` (não há `--ink-500`/`--ink-550` etc.); uma var CSS inexistente sem fallback não dá erro nenhum, só renderiza "nada" silenciosamente (achado corrigido na revisão do painel do metrônomo, fácil de repetir em qualquer CSS novo).
- Metrônomo: volume do painel é só visual (`engine.ts` não tem `GainNode` ainda); `audioSuspended` no `metronomeStore` nunca é setado (banner "áudio suspenso pelo sistema" do Dossier §8.4 não implementado); `engine.start()` não guarda contra `connect()` duplicado se chamado duas vezes sem `stop()` entre elas (mitigado pela store, que só chama `start` se não `running`).
- `recoverOnBoot` (gravações) retorna `recoveredTakes: 0` fixo — regra real de recuperação de um take `RECORDING` após crash ainda não definida; decidir na Fase 7/8 com hardware real.
- Relatório de auditoria da Milestone 5 (gaps vs. Dossier, achados por severidade): `AUDIT-milestone5.md` na raiz do repo.

## 10. CI (GitHub Actions)

- `.github/workflows/ci.yml`: job `quality` (`bun install --frozen-lockfile` → lint → typecheck → `vitest run src/domain --coverage`, thresholds em `vitest.config.ts`) e job `rust` (`cargo check`/`test`/`clippy -D warnings`, instala `libasound2-dev` e libs do Tauri via `apt-get` — funciona aqui mesmo não funcionando no WSL local). `timeout-minutes: 40` no job `rust` (cache cold passa de 20 min).
- Usa `bun`, não `npm` (lockfile único, `npm` global já esteve quebrado nesta máquina).
- Não inclui `tauri build`/MSIX — fica para um pipeline de release separado (Milestone 11/12).

## 11. cpal 0.18.2 — API de entrada (verificado no crate local)

- `SampleFormat` também expõe `I8`, `I64`, `U8`, `U32` e `U64`, além dos formatos mais comuns e `I24` (tipo `dasp_sample::I24`, representação `i32` em S24_32 com os 24 bits válidos nos bits altos; acessar via `.inner()` e deslocar 8 bits para sinal estendido. Oferece `.new(i32) -> Option<I24>`/`.new_unchecked(i32)`, sem `as_i32()` ou constantes públicas `MIN`/`MAX`). Captura deve converter os formatos inteiros suportados, não presumir apenas `I16`/`I32`/`U16`. Fonte: `cpal-0.18.2/src/sample_format.rs`, host adapters e `dasp_sample-0.11.0/src/types.rs`.
- `DeviceId` implementa `FromStr`/`Display`, `HostTrait::device_by_id(&DeviceId)` reabre IDs persistidos, e o callback typed usa `build_input_stream(config: StreamConfig, ...)` por valor. Fonte: `cpal-0.18.2/src/lib.rs` e `src/traits.rs`.
- Em cpal 0.18.2, `build_input_stream`, `StreamTrait::play` e `pause` retornam o mesmo `cpal::Error` (não há `BuildStreamError`/`PlayStreamError`); `SampleRate` é alias de `u32`. Fonte: `cpal-0.18.2/src/traits.rs` e `src/lib.rs`.
- O teste atual `audio::pitch::tests::pure_sines_are_accurate_within_one_cent` falha para 2000 Hz no WSL (resultado 2002.0404 Hz, erro 1.765 cents); detector e teste precisam de revisão de calibração antes de exigir `cargo test` limpo. Fonte: `cargo test --manifest-path src-tauri/Cargo.toml` na branch `milestone-07/audio-afinador`, 2026-10-26.
