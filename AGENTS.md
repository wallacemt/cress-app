# AGENTS.md — Cress

Regras e descobertas acumuladas para qualquer agente (ou pessoa) trabalhando neste repositório. Objetivo: nunca reconsultar/redescobrir algo que já está aqui — economiza tokens e evita retrabalho.

## Regra permanente

**Toda descoberta nova relevante (decisão, correção de premissa, fato verificado sobre uma lib/API, armadilha evitada, padrão comprovado em outro projeto) entra neste arquivo antes de a tarefa ser considerada concluída.** Formato: seção curta, factual, com a fonte. Não duplicar o que já está documentado em `docs/` (Blueprint, Dossier, PRD, arch.md) — aqui só entra o que *não* está lá, ou o que corrige/atualiza o que está lá.

Ao atualizar: adicionar nas seções abaixo, nunca reescrever o histórico de decisões já tomadas sem marcar a mudança.

---

## 1. Onde está cada coisa

- **Repositório deste código:** `cress-app/` — GitHub `wallacemt/cress-app` (remote configurado, `gh auth status` OK).
- **Documentação de produto/arquitetura/design vive FORA deste repo**, em `../docs/` (pasta pai `cress/docs/`, que não é um repo git): `PRD.md`, `arch.md`, `briefing-design.md`, `blueprints/The-Blueprint-001.md`, `dossiers/Dossier-de-Creation-001.md` + `design-tokens.json`.
  - **Implicação:** referências a essa documentação em issues/PRs do GitHub não podem ser links de arquivo clicáveis (o arquivo não está no repo). Usar referência textual (seção/ADR) ou, se algum dia pedirem, copiar `docs/` para dentro de `cress-app/`.
- **Milestones e Issues já criadas no GitHub** (`wallacemt/cress-app`): 12 milestones mapeando as 11 fases do Blueprint-001 + uma 12ª milestone nova ("Distribuição — Store") que o Blueprint deixa fora do MVP de implementação (ADR-20). ~73 issues. Não recriar — editar/complementar as existentes.
- **Caso de sucesso de referência para distribuição/CI:** `../CRITIX/critix_vault_desktop/` — app Tauri já publicado, com pipeline de MSIX/updater funcionando em produção. Ver §4.

## 2. Stack e versões travadas (Blueprint-001 §4) — não atualizar sem motivo forte

| Camada      | Lib                                               | Versão exata                                                     |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Desktop     | `tauri` / `tauri-build`                       | 2.12.1 / 2.7.1                                                    |
| CLI/API     | `@tauri-apps/cli` / `@tauri-apps/api`         | 2.12.1 / 2.12.1                                                   |
| DB          | `tauri-plugin-sql`                              | 2.5.0                                                             |
| Dialogs     | `tauri-plugin-dialog` (só Rust, sem pacote JS) | 2.8.1                                                             |
| Log         | `tauri-plugin-log`                              | 2.10.0                                                            |
| Áudio      | `cpal`                                          | **=0.18.2** (fixo; 0.19 troca `play()`→`start()`)      |
| Ring buffer | `rtrb`                                          | 0.4.0                                                             |
| WAV         | `hound`                                         | 3.5.1                                                             |
| Hash        | `sha2`                                          | 0.11.0                                                            |
| UI          | `react`/`react-dom`                           | 19.3.0                                                            |
| Build       | `vite`                                          | 8.3.3                                                             |
| TS          | `typescript`                                    | 6.0.3 (travado por`typescript-eslint` 8.71.1 exigir `<6.1.0`) |
| CSS         | `tailwindcss`                                   | 4.3.3                                                             |
| Docking     | `dockview-react`                                | 8.4.1                                                             |
| PDF         | `pdfjs-dist`                                    | 6.4.299                                                           |
| Rotas       | `react-router`                                  | 8.4.0 (`createHashRouter`)                                      |
| Estado      | `zustand`                                       | 5.0.15 (só runtime, nunca fonte de verdade persistida)           |

Regra do Blueprint: `npm i -E` sempre. Se uma versão não estiver disponível no momento da instalação, **parar e reportar**, não aceitar um `^` próximo.

## 3. Decisões arquiteturais que já foram tomadas (não reabrir sem novo fato)

- Domínio e aplicação **só em TypeScript**; Rust é só áudio nativo + arquivos (ADR-01).
- `StudySession`: estados `ACTIVE ⇄ PAUSED → FINISHED` (não o `IDLE/PREPARING/RECORDING/PAUSED/FINISHED` do `arch.md` antigo) — ADR-06.
- Nenhum caminho absoluto de arquivo cruza o webview em nenhuma direção — diálogos de arquivo/pasta são abertos **pelo Rust** (`tauri-plugin-dialog`, zero permissão `dialog:*` ao webview) — ADR-17.
- Heurística de importação de partituras por pasta: agrupamento por **nome-base dentro do mesmo diretório**, nunca entre diretórios; "obra = subpasta" não é regra — ADR-18 (algoritmo completo documentado lá, não reimplementar do zero).
- Workspace dockável via `dockview-react`; popout (janela nativa separada) **desligado deliberadamente** — ADR-14.
- `identifier = "dev.wallacesantana.cress"` e `publisher = "Wallace Santana"` — **imutáveis a partir da primeira publicação**, não propor mudança — ADR-20.
- Ambiente oficial de `tauri dev`/`tauri build` é **Windows nativo**, nunca WSL (áudio/cpal não funciona igual no WSLg) — ADR-04, §4. WSL só roda `vitest`/`cargo test` sem hardware.

## 4. Correções feitas sobre o Blueprint-001, a partir do caso real do Critix Vault

O Blueprint-001 (ADR-20) assumia que "o Tauri gera EXE (NSIS) e MSI, não MSIX" e que a submissão na Store seria de um "app Win32 que aponta para o instalador". **Isso está desatualizado/incompleto** — o Critix Vault (`../CRITIX/critix_vault_desktop`), já publicado, prova um caminho funcional para gerar um `.msix` real:

1. `tauri build` normal com `msi` nos `bundle.targets`.
2. Extrair os arquivos do app de dentro do `.msi` via instalação administrativa: `msiexec /a app.msi TARGETDIR=staging /qn` (não instala de verdade, só extrai).
3. Montar a pasta do pacote MSIX: copiar os arquivos extraídos + gerar `Assets/` (ícones redimensionados com `System.Drawing` do .NET, sem dependência nova) + preencher um `AppxManifest.xml` próprio (não existe no scaffold do Tauri — precisa ser escrito à mão).
4. Empacotar com `makeappx.exe` (vem no Windows SDK): `makeappx.exe pack /d <pasta> /p saida.msix /o`.
5. **Não assinar localmente** — a Microsoft Store assina o `.msix` na publicação (confirmado no próprio script do Critix: "Do NOT sign the package locally - the Store signs it for you"). Um certificado Authenticode de assinatura de código **só é necessário se também distribuir fora da Store** (download direto com updater próprio).
6. Upload do `.msix` em Partner Center → Submissions → Upload packages.

Referências no código do Critix: `.github/workflows/msix-build.yml`, `scripts/build-msix.ps1`, `src-tauri/packaging/AppxManifest.xml`. Issues do Cress já atualizadas com isso: `#66`, `#67`, `#69`, `#70`, `#72` (milestone 12) e `#73` (milestone 11).

### Outras descobertas do caso Critix (aplicáveis com adaptação)

- `tauri build` **não gera** um `latest.json` agregado do updater por conta própria — isso só existe via a GitHub Action `tauri-apps/tauri-action`. Sem usá-la, o manifesto precisa ser montado manualmente a partir dos arquivos `.sig` gerados ao lado de cada instalador.
- Chave de assinatura do updater (`tauri-plugin-updater`) é um par minisign gerado por `npm run tauri signer generate` — **não tem relação** com certificado Authenticode. São dois mecanismos de assinatura independentes, fácil de confundir.
- O Critix embute um servidor Node.js (Next.js) dentro do bundle Tauri e por isso precisa de passos extras (Node portátil, rebuild do `better-sqlite3` para a ABI certa, capability `privateNetworkClientServer` no `AppxManifest.xml`, regra de firewall para `node.exe`). **O Cress não tem esse servidor** (usa `tauri-plugin-sql` direto) — não copiar esses passos, só os de empacotamento MSIX em si.
- O CI do Critix (`ci.yml`) deixa `cargo check` comentado como débito técnico. **Não repetir isso no Cress** — `cargo test`/`clippy` entram no CI desde o início (ADR-12 já exige isso localmente).

## 5. Ferramental para gerenciar milestones/issues

Criação/edição em massa de issues e milestones é feita via `gh` CLI (`gh issue create/edit`, `gh api repos/wallacemt/cress-app/milestones`) chamado por um script Python descartável (não versionado — vive em scratch de sessão). `gh issue create --milestone` espera o **título** da milestone, não o número.

## 6. Decisões de processo com o usuário

- Nunca adicionar atribuição de IA (Co-Authored-By Claude, menção a Claude Code) em commits/issues/PRs — regra do `CLAUDE.md` global do usuário.
- Design do app já está decidido e aprovado até a direção "03 · Dashboard — Nav F (atril)" com efeito glass — ver Dossier §8.13.1. Não reabrir alternativas de navegação (A–E) sem pedido explícito.
- **Toda milestone e toda feature (cada issue, na prática) é trabalhada em uma branch separada.** Nunca commitar direto em `main`. Convenção de nome: `milestone-<NN>/<slug-da-milestone>` para trabalho guarda-chuva de uma milestone, ou `feature/<slug-da-issue>` (ou `fix/<slug>` para correções) para o trabalho de uma issue específica — abrir a partir de `main` atualizada, e abrir PR de volta para `main` ao concluir. Isso vale também para trabalho de agente (ex.: `EnterWorktree`/branch dedicada), nunca editar o checkout compartilhado do usuário na `main`.

## 7. Descobertas da Milestone 1

- O registry npm mantém `vite@8.3.3` disponível; a primeira tentativa deixou uma instalação parcial por cache npm em `/home`, então instalações neste workspace devem usar `npm_config_cache` apontando para `/tmp` (fato verificado por `npm view` e pela falha EROFS).
- O adaptador `node:sqlite` precisa habilitar explicitamente `PRAGMA foreign_keys = ON`; `NodeSqliteDb` faz isso no construtor e o teste de integração confirma rejeição de FK inválida (fonte: teste local `src/infrastructure/db/nodeSqliteDb.test.ts`).
- A validação dos itens de áudio, asset protocol, dockview e diálogo exige WebView2/WASAPI nativos; WSL só fornece evidência para o adaptador SQLite (fonte: `SPIKE.md`, execução desta milestone).

## 8. Limitação conhecida deste ambiente (WSL)

- `cargo check`/`cargo test`/`cargo clippy` falham neste WSL com `failed to run custom build command for alsa-sys v0.4.0` — falta o pacote de sistema `libasound2-dev` (dependência Linux do `cpal`, já prevista em `arch.md` §15/ADR-04 "Consequences"). Não é bug de código. Requer `sudo apt-get install -y libasound2-dev` (uma vez, precisa de senha — não automatizável por um agente sem acesso a sudo interativo). Depois de instalado, re-rodar `npm run check`/`cargo check` normalmente.

## 9. Descobertas da correção da Milestone 1

- O `node_modules` compartilhado no checkout WSL pode ficar parcialmente reificado: `npm install` termina, mas módulos internos de ESLint/Vitest podem faltar. Uma cópia temporária limpa com `npm ci` é uma verificação válida do projeto; nessa cópia, lint, typecheck e Vitest passaram (fonte: execução desta correção).
- O CLI `shadcn@4.21.3 init -d` foi executado, mas não completou por módulo ausente no `node_modules` compartilhado (`zod-to-json-schema/.../any.js`). `components.json` e `src/components/ui/.gitkeep` foram preparados conforme o contrato; repetir o CLI em uma instalação limpa quando os componentes forem adicionados (fonte: execução desta correção).
- O TypeScript não inclui os tipos globais de `AudioWorkletProcessor` nem `node:sqlite` nesta combinação de libs; declarações locais mínimas em `src/features/spike/click-processor.ts` e `src/types/node-sqlite.d.ts` mantêm o fixture do spike verificável sem alterar o runtime (fonte: `npm run typecheck`).
- **Causa raiz confirmada** do ponto acima: o repo vive em `/mnt/e/...`, montado via 9p (`drvfs` do WSL), que é lento/não-atômico para pacotes com muitos arquivos pequenos (caso do ESLint) e pode corromper a instalação sem erro visível no `npm install`. Correção: `rm -rf node_modules && npm install` (confirmado nesta máquina — lint/typecheck/test passaram limpos depois). Se voltar a acontecer, reinstalar do zero antes de depurar módulo a módulo.

## 10. Correções encontradas só ao validar no Windows (cargo check fica bloqueado no WSL)

- `tauri_plugin_dialog::DialogExt::blocking_pick_folder()` retorna `Option<FilePath>` diretamente, **não** `Result<Option<FilePath>, Error>` — não há `.map_err` a fazer. O command correto é `Ok(app.dialog().file().blocking_pick_folder().map(|p| p.to_string()))` (fonte: build real no Windows, 2026-10-13).
- `tauri.conf.json` → `plugins.sql.preload` espera uma **connection string** (ex.: `"sqlite:cress.db"`), não o caminho do arquivo `.sql` de migration. O arquivo de migration entra via `include_str!` no `Migration` registrado em `lib.rs`, não no `preload` (fonte: mesmo build).
- Esses dois bugs não aparecem em `npm run typecheck`/lint — só `cargo build`/`tauri dev` real pega. Como este WSL não compila o lado Rust (§8), **builds reais no Windows são a única verificação confiável do `src-tauri/`** até `libasound2-dev` ser instalado aqui.

## 11. Descobertas da Milestone 2

- A camada de domínio foi implementada sem dependências externas, na ordem definida pela Fase 2; a validação local usa `DomainError` com códigos estáveis e funções puras.
- `src/domain/__fixtures__/violino-folder.json` é uma fixture sintética realista de placeholder (não representa os ~7.000 arquivos reais). Serve para equivalência inicial dos casos AC-S2/AC-S2b e deve ser substituída/validada pela fixture real gerada na Fase 9 (fonte: Blueprint §14 Fase 2 e §15 AC-S2).
- Nesta máquina, o `npm` global está genuinely quebrado (a própria instalação do CLI não resolve `graceful-fs`/`semver` — `npm --version` já falha com `MODULE_NOT_FOUND`, não é um problema deste projeto). `bun add -D --exact @vitest/coverage-v8@5.0.3` funcionou normalmente e resolveu a dependência (confirmado: `node_modules/@vitest/coverage-v8` presente, `vitest run --coverage` executa). `package.json` foi atualizado manualmente para declarar a versão exata; `package-lock.json` ficou desatualizado em relação a essa entrada porque não há `npm` funcional aqui para regenerá-lo — reconciliar com `npm install` normalmente num ambiente com `npm` saudável (ex. Windows) antes de confiar nele de novo.
- Cobertura real de `src/domain` nesta milestone (segunda passada, com testes de fato escritos): **95.83% statements / 96.23% lines / 84.97% branches / 100% funcs** — atende a meta de ≥95% da DoD da Fase 2 por statements/lines (fonte: `vitest run src/domain --coverage`, 2026-10-13).

## 12. CI (GitHub Actions)

- `.github/workflows/ci.yml`: dois jobs em paralelo, `push`/`pull_request` para `main`.
  - `quality` (`ubuntu-latest`): `bun install --frozen-lockfile` → `lint` → `typecheck` → `vitest run src/domain --coverage`. Thresholds de cobertura (lines/statements/functions ≥95%, branches ≥80%) ficam em `vitest.config.ts` (`test.coverage.thresholds`, escopado a `src/domain/**/*.ts`) — o próprio Vitest falha o job se cair abaixo, não é só um número reportado.
  - `rust` (`ubuntu-latest`): instala `libasound2-dev` + libs do Tauri (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`) via `apt-get`, roda `cargo check`/`cargo test`/`cargo clippy -D warnings` contra `src-tauri/Cargo.toml`. **Diferente deste WSL (§8), o runner do GitHub tem `sudo` real e instala `libasound2-dev` sem problema** — por isso o lado Rust é verificável em CI mesmo não sendo verificável aqui.
  - Usa `bun` (não `npm`) porque é o que está sincronizado e funcional (`bun.lock`) — ver nota da Milestone 2 sobre o `npm` global quebrado nesta máquina. Em um runner limpo o `npm` funcionaria normalmente, mas manter `bun` em CI evita duas fontes de verdade de lockfile.
  - **Não inclui `tauri build`/MSIX/instalador** — ADR-04 exige Windows nativo para isso; fica para um pipeline de release separado (Milestone 11/12), não para o CI de toda PR.
  - **Timeout do job `rust`:** a primeira execução (cache cold, sem `Swatinem/rust-cache` ainda) compila `tauri`+`webkit2gtk-sys` do zero e passa de 20 min (`cargo check` passou, `cargo test` foi cancelado por timeout). Ajustado para `timeout-minutes: 40`. Execuções seguintes devem ficar bem mais rápidas com o cache do `Swatinem/rust-cache` quente (fonte: run real `38479306097` em 2026-10-13).

## 13. Descobertas da Milestone 3

- O adaptador `NodeSqliteDb` precisa expor `exec(sql)` além de `SqlDb.execute/select`: migrations contêm vários statements e não podem passar por `prepare` como uma única instrução (fonte: implementação de `src/application/test-support.ts`, 2026-10-13).
- O contrato de portas da §8.1 inclui métodos de captura/entrada que não são necessários nos casos de uso desta milestone; os fakes locais implementam apenas o subconjunto de gravação e importação exigido por #17–#22, sem criar runtime Rust prematuramente (fonte: escopo da Milestone 3 e `src/application/deps.ts`, 2026-10-13).
- O SQL efetivamente versionado nesta branch usa `recordings.status IN ('RECORDING','COMPLETE')`, enquanto o tipo de domínio usa `ACTIVE/PAUSED/COMPLETE`; a persistência deve tratar `RECORDING` como o estado ativo de uma tomada para respeitar a constraint do banco (fonte: `src-tauri/migrations/0001_init.sql` e `src/domain/recording.ts`, 2026-10-13).
- `finishSession` precisa parar o take ativo antes de persistir o fim da sessão; os parâmetros `finalBpm`, `notes` e `completeGoal` não podem ser descartados (fonte: correção da aplicação da Milestone 3, 2026-10-13).
- Reabrir um goal exige gravar `completed_at = NULL`; usar apenas fallback do valor antigo mantém o goal concluído (fonte: teste de aplicação `src/application/goals.test.ts`, 2026-10-13).
- O fake `ScoresPort` precisa expor `scan`/`results` com getters e setters, pois cópia por spread não permite configurar o estado usado pelos métodos assíncronos (fonte: `src/application/test-support.ts`, 2026-10-13). `pickAndImportFile` não tem um setter dedicado — os testes sobrescrevem o método direto via `Object.assign(d.scores, { pickAndImportFile: async () => (...) })`, que funciona porque o objeto retornado por `fakeScoresPort()` é um literal comum, não congelado.
- **Revisão desta milestone (segunda correção):** a primeira passada corretiva deixou os arquivos de teste comprimidos numa linha só por `it()` (mesmo defeito de legibilidade já visto na Milestone 2) — resolvido rodando `npx prettier --write src/application src/infrastructure` (Prettier reformata estruturas de uma linha normalmente, não precisou reescrever à mão). `src/application/milestone3.test.ts` foi apagado por ficar inteiramente duplicado pelos testes novos por módulo. `scores.test.ts` ganhou os casos que faltavam (`attachScoreFile` sucesso/cancelado/duplicado, `renameScore`/`deleteScore`/`setScoreLastPage` com erros, `reorderScore` nos dois sentidos incluindo os limites).
- **Gap sinalizado para revisão humana, não decidido silenciosamente:** `recoverOnBoot` retorna `recoveredTakes: 0` fixo. A tabela §8.2 pede `{recoveredSession, recoveredTakes}` mas nem o Blueprint nem o ADR-06 detalham a regra de recuperação de um take que ficou com `status='RECORDING'` após um crash (não existe função `recover` em `domain/recording.ts`, e a tabela não especifica se o take deveria virar `COMPLETE` com duração desconhecida, continuar `RECORDING`, ou algo definido só na Fase 7/8 quando o Rust real existir). Deixado como placeholder documentado — decidir a regra real quando a Fase 7/8 (áudio Rust) estiver sendo implementada, com contexto de hardware real.

## 14. Bug real: checksum de migration quebrando o app já em uso (2026-10-15)

- **Sintoma relatado pelo usuário:** o app, que já tinha rodado antes no Windows, passou a dar erro ao iniciar. Causa: `src-tauri/src/lib.rs` embute `src-tauri/migrations/0001_init.sql` via `include_str!` em tempo de compilação, e `tauri-plugin-sql` (sqlx por baixo) grava um checksum do conteúdo da migration na primeira vez que ela é aplicada (tabela interna de controle do sqlx). Se o arquivo mudar de bytes entre builds — **mesmo sem nenhuma mudança semântica** — o próximo `cargo build`/`tauri dev` embute um checksum diferente e o sqlx recusa a inicialização com algo como "migration was previously applied but has been modified".
- **Causa raiz encontrada:** o arquivo versionado no git (commit `e8e861a`, Milestone 1) é SQL compacto de uma linha por tabela, LF. O arquivo no checkout de trabalho (`/mnt/e/...`, compartilhado entre WSL e Windows) estava reformatado em SQL multi-linha legível **e** com CRLF — mudança não commitada, provavelmente de um formatador de SQL do editor rodando "format on save" sem o arquivo ter sido re-commitado depois. Confirmado por diff ignorando espaço em branco: **zero diferença semântica**, só formatação/EOL.
- **Correção aplicada:** adotado o SQL multi-linha (mais legível, consistente com o resto do projeto) como versão canônica, com LF. Adicionado `.gitattributes` forçando `src-tauri/migrations/*.sql text eol=lf`, para que o checkout nunca mais varie por OS/config local de `core.autocrlf` — os bytes embutidos pelo `include_str!` ficam estáveis entre qualquer máquina/clone.
- **Esta correção não desfaz o dano já feito no banco local do usuário.** Quem já tinha a app rodando com um checksum antigo precisa apagar o banco de desenvolvimento uma vez (sem problema, é pré-release, sem dados reais): no Windows, o arquivo é `%APPDATA%\dev.wallacesantana.cress\cress.db` (identifier do `tauri.conf.json` + nome do arquivo do `plugins.sql.preload`). Apagar esse arquivo e rodar `tauri dev`/abrir o app de novo recria o banco do zero com o checksum atual.
- **Lição geral:** qualquer arquivo lido via `include_str!`/embutido em binário e que tenha checksum/hash persistido por uma lib (migrations, assets versionados por hash, etc.) precisa ter EOL fixado via `.gitattributes` desde o início — não é só estética, é um bug de runtime latente. Reavaliar se outros arquivos embutidos no Rust (ícones, etc.) têm o mesmo risco se algum dia ganharem checksum.

## 15. Descobertas da UI de onboarding

- Neste checkout, o arquivo `*.dom.test.tsx` executou em ambiente `node` apesar da configuração `environmentMatchGlobs`; a diretiva `// @vitest-environment jsdom` no próprio teste fez o RTL receber `document` (fonte: execução de `bun run test`, 2026-10-15).

## 16. Execução do Vitest no checkout WSL em `/mnt/e`

- `bun run test` pode falhar ao iniciar o worker paralelo de `src/features/onboarding/OnboardingPage.dom.test.tsx` com `Timeout waiting for worker to respond`, mesmo quando os demais testes passam. Nesta máquina, `bun run test -- --maxWorkers=1` passou (23 arquivos/64 testes), indicando limitação de inicialização paralela neste checkout montado em 9p; não reduzir o paralelismo padrão do projeto apenas para contornar a máquina local (fonte: duas execuções padrão e uma serial em 2026-10-17).

## 17. Revalidação dos workers DOM no WSL (2026-10-17)

- Ao adicionar `SettingsPage.dom.test.tsx`, duas execuções de `bun run test -- --maxWorkers=1` não iniciaram os workers DOM de onboarding e settings (`Timeout waiting for worker to respond`); 22 arquivos/62 testes passaram nas duas tentativas. A execução isolada do teste de settings com pool `threads` também expirou antes de executar testes. Isto confirma uma falha de inicialização do worker neste checkout 9p, não uma falha de asserção; os testes DOM precisam ser reexecutados em um ambiente onde os workers iniciem (fonte: execuções locais desta issue).
- **Causa raiz confirmada:** não é flakiness aleatória — o pool padrão (`forks`/`threads` com `isolate: true`) sobe um worker novo por arquivo, e nesta máquina o setup do ambiente `jsdom` é lento demais pra responder dentro do timeout de start quando isso acontece pra cada arquivo `*.dom.test.tsx`. `bun run test -- --no-isolate` reaproveita o worker entre arquivos (paga o custo de setup do `jsdom` uma vez só) e passou limpo: **24 arquivos/66 testes, 0 erros** (fonte: validação da issue #25, 2026-10-17). Usar esse flag só para validação local nesta máquina — não é para mudar o `isolate` padrão do projeto/CI sem motivo mais forte.
- Na validação da issue #27, `bun run test -- --no-isolate` teve timeout nos três workers DOM na primeira tentativa e passou na repetição: **25 arquivos/68 testes, 0 erros**. Se ocorrer, repetir o comando uma vez antes de concluir que há falha no teste (fonte: validação local, 2026-10-17).

## 18. Dockview React 8.4.1 — renderers e tema

- `defaultRenderer` configura o padrão do Workspace; a API 8.4.1 não tem `rendererOverride`. O modo de renderização é por painel em `addPanel({ renderer })` ou `panel.api.setRenderer(...)`. Para score, aplique `always` em `onDidAddPanel` (e nos painéis já existentes ao iniciar); os demais usam `onlyWhenVisible` (fonte: `dockview-core/dist/cjs/dockview/options.d.ts` e `dockviewPanelApi.d.ts`, pacote instalado 8.4.1, issue #30).
- As variáveis CSS do tema devem seguir `dockview-react/dist/styles/dockview.css` — por exemplo `--dv-group-view-background-color`, `--dv-tabs-and-actions-container-background-color`, `--dv-drag-over-background-color`; nomes antigos sem `-color` não têm efeito (fonte: CSS instalado 8.4.1, issue #30).

## 19. Persistência do Workspace — formato do layout no Dockview 8.4.1

- `DockviewApi.toJSON()` serializa a grade como `grid.root`; ramos guardam filhos em `data`, e folhas guardam `views` em `data`. O sanitizador precisa tratar essa estrutura instalada, além do formato antigo coberto pelos testes, ou layouts reais serão rejeitados como inválidos (fonte: `dockview-core/dist/cjs/dockview/dockviewComponent.d.ts` e `gridview/gridview.d.ts`, issue #31).

## 20. Menus do Workspace — API Dockview 8.4.1

- A API pública tipada do `DockviewApi` expõe `IDockviewPanel.api.moveTo({ group, position })` para mover um painel e `IDockviewGroupPanel.api.moveTo(...)` para mover um grupo; `getPopouts()` lista grupos em janelas popout. `moveGroupOrPanel` e `floatingGroups` existem no componente interno, mas não fazem parte do `DockviewApi` público usado por `DockviewReadyEvent` (fonte: `dockview-core/dist/cjs/api/component.api.d.ts`, `dockviewPanelApi.d.ts` e `dockviewGroupPanelApi.d.ts`, pacote instalado 8.4.1, issue #32).
- `Position` em `moveTo` usa `top/bottom/left/right/center`; não passe `above/below` (esses nomes pertencem à direção de adição de grupo em outros contratos) (fonte: `dockview-core/dist/cjs/dnd/droptarget.d.ts`, pacote instalado 8.4.1, issue #32).

## 21. Rotas Workspace — setup e shell em tela inteira

- `/practice/new` carrega repertório e objetivos pelas funções da aplicação no componente, seguindo o padrão de `PieceDetailPage`; `/practice/:sessionId` lê a sessão pelo repositório e resolve obra/objetivo antes de montar `Workspace` (fonte: issue #33 e implementação local, 2026-10-23).
- `AppShell` mantém o mesmo roteador e omite aside/header globais nas rotas `/tools` e `/practice/*`; a classe de tela inteira precisa dar ao shell `height: 100vh` para o Workspace preencher a janela (fonte: implementação local, 2026-10-23).
- O catálogo e `AddPanelMenu` filtram `recorder` e `session` fora de modo `session`; o submenu de partitura pode comunicar que a seleção completa chega na Fase 9 (fonte: `src/domain/workspace.ts`, `src/features/workspace/AddPanelMenu.tsx`, confirmado na issue #33).

## 22. Painel de sessão no Workspace

- Painéis Dockview leem contexto específico pela propriedade `params` do `addPanel`; layouts restaurados podem receber os dados atualizados via `panel.api.updateParameters` (fonte: integração da issue #35, pacote dockview-react 8.4.1).
- Alterar o objetivo associado à sessão passa por `setSessionGoal` em `application/sessions.ts`, que valida que o objetivo pertence à obra da sessão antes de persistir (fonte: implementação da issue #35, 2026-10-23).

## 23. Mudança de processo: Milestone 5 em uma branch só, uma issue por commit (2026-10-23)

- Diferente das Milestones 3/4 (uma branch + PR por issue), a Milestone 5 foi pedida
  pelo usuário com um processo diferente: uma única branch
  `milestone-05/workspace-shell-fluxo-sessao`, com cada issue (#30–#35) como um commit
  separado terminando em `Closes #NN`, e um único PR (#85) da branch para `main`. Ao
  mergear (merge normal, não squash), cada commit individual fecha sua issue, porque o
  GitHub escaneia por `Closes #N` em qualquer commit que chega na branch default, não só
  no corpo do PR. **Não squash-mergear este PR** — perderia esse vínculo por issue.
- Se futuras milestones pedirem o mesmo padrão, repetir: branch única a partir de `main`
  atualizada, um `codex exec` por issue (nunca várias issues no mesmo prompt), validar
  (`bun run lint && bun run typecheck && bun run test -- --no-isolate`) e comitar antes
  de passar para a próxima issue, PR único ao final.
