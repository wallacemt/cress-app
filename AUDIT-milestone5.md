# Auditoria da Milestone 5 — Workspace

**Escopo:** leitura do código atual, comparação com o Dossier §8.2–§8.3/§8.8 e Blueprint Fase 5. O arquivo `.penpot` não foi aberto. O working tree já tinha muitas alterações do usuário; esta auditoria não as reverteu. Única alteração funcional desta tarefa: `dragDropEnabled: false` em `src-tauri/tauri.conf.json`.

## Resumo executivo

- **Bloqueador de interação identificado e mitigado:** Tauri ativa por padrão seu handler de drop nativo; o schema da CLI instalada diz explicitamente que HTML5 drag-and-drop no frontend Windows exige desativá-lo. `dragDropEnabled: false` foi aplicado.
- A mitigação explica o sintoma de abas não arrastarem, mas não foi possível validar num build Windows; AC-M7 segue pendente até teste manual.
- Floating e split estão habilitados no Dockview; há comandos alternativos acessíveis no menu Layout. Não há evidência de `pointer-events` ou z-index no CSS impedindo o DnD.
- Layout persistido pode manter um arranjo antigo; “Restaurar layout padrão” é o controle disponível para descartá-lo.
- A navegação atual mantém a sidebar vertical, em conflito com a direção Atril aprovada; isso já está rastreado em #86.
- O fluxo de nova sessão existe por rota, mas não há link/botão para `/practice/new` na navegação visível.
- Metrônomo, afinador, gravações e seleção de partituras são placeholders intencionais da Fase 5; o painel Sessão é real.
- O CSS do tema coincide nos valores centrais de gap, overlay, sash e pauta; há diferenças visuais secundárias no watermark e no título do painel Sessão.

## 1. Alinhamento Penpot/Dossier

Referências de design: `/mnt/e/WorkSpace/PESONAL_PROJECTS/cress/docs/dossiers/Dossier-de-Creation-001.md`, §8.2.1–§8.2.5, §8.3, §8.8 e §8.13.1. Referências de implementação: `src/features/workspace/workspace-theme.css` e componentes citados abaixo.

| Achado | Atual | Dossier | Avaliação |
|---|---|---|---|
| Gap entre grupos e corredor | `Workspace.tsx:59-69` define `gap: 8`; `workspace-theme.css:103-106` tem padding 8 e fundo `#05070d`. | §8.2 define `gap: 8` e corredor `#05070D`. | Alinhado. |
| Aba, altura, padding, label | `workspace-theme.css:60-65,119-126,159-163`: 36 px, padding 12 px e limite de texto 200 px. | §8.2.1: altura 36 px, padding 12 px, label truncado máx. 200 px. | Alinhado. |
| Aba em drag e indicador | `Workspace.tsx:64-69`: animação suave, indicador `line`, borda lilás 60%; `workspace-theme.css:172-175`: fundo `rgb(124 58 237 / 0.14)`, borda 60%, radius 8. | §8.2.1–§8.2.2: ghost 85%, linha 2 px; overlay 14%/60%, radius 8, transição 120 ms; edge indicator 90%. | Cores/valores base alinhados. Não encontrei regra CSS explícita para opacidade do tab ghost ou duração/easing 120 ms do overlay; conferir comportamento visual em runtime. Severidade baixa. |
| Sash | `workspace-theme.css:80-84,177-220`: repouso transparente; linha 2 px, cor 55%, delay 150 ms; ativo 100%. | §8.2.3: repouso invisível; linha de 2 px a 55%, aparece após 150 ms; arraste 100%. | Alinhado. A área do sash vem do Dockview e não há regra local removendo seu hit area; cursor do corredor deve ser conferido visualmente. |
| Floating | `workspace-theme.css:89-97,222-242`: sombra, borda, opacidade 0.85, titlebar 20 px, pega central 28×6, radius 12. `Workspace.tsx:164` não desabilita floating. | §8.2.4: mesmos valores conceituais; pega de 6 pontos; tamanho inicial 320×340. | Parcial: tratamento visual e habilitação estão presentes; pega é aproximação CSS por gradiente e não ícone dedicado; não há configuração de tamanho inicial 320×340. Severidade baixa, efeito só no aspecto/primeiro floating. |
| Watermark | `panelRegistry.tsx:35-52`, `workspace-theme.css:316-376`: pauta de 5 linhas a 5%, width 60%, ícone 32 px, título 20 px, descrição 14 px, botão + Painel. | §8.2.5: pauta 5% centralizada, ícone 32, `title-sm`, `text-sm`, botão secondary sm. | Pauta e dimensões alinhadas. Diferenças: texto do botão não está ligado ao AddPanelMenu (`panelRegistry.tsx:50-52`); título CSS usa 20 px/1.3 (`workspace-theme.css:356-360`), menor que o token provável `title-sm` não explicitado numericamente na seção; watermark não define fundo próprio e depende do fundo do grupo. Botão atualmente não abre menu (gap funcional médio). |
| Cabeçalho | `workspace-theme.css:8-19` usa 56 px, `ink-850`, borda sutil. | §8.3: 56 px, `ink-850`, borda sutil. | Dimensão/fundo alinhados. Conteúdo incompleto: não existe pílula REC nem metrônomo funcional, ambos pertencem a fases futuras. O relógio é `MM:SS`, sem indicador de pausa/texto nem horas (`WorkspaceHeader.tsx:40-42,77`). |
| Sessão | `SessionPanel.tsx:78-100`; `workspace-theme.css:266-306`. Card atual tem borda sólida sutil e fundo branco 2% (`:275-282`); descrição 18 px; textarea mínimo 180 px, status textual. | §8.8: card `ink-750`, radius 8, padding 16; descrição `text-lg`; notas `text-base`, autosave; badge/check status. | Parcial: objetivo e notas salvam; card não usa explicitamente `ink-750` nem radius 8 (usa 12 e translucidez), falta feedback visual dourado animado do objetivo concluído, status “Salvo” é texto sem ícone check, e min-height 180 pode divergir do dimensionamento previsto. Severidade baixa. |
| Shell/navegação | `AppShell.tsx:47-59` ainda renderiza `aside` vertical e não Atril. | §8.13.1: régua flutuante inferior glass, sem sidebar. | Divergência alta de design, já rastreada em #86 conforme instrução; não duplicada como achado novo. |

## 2. Gaps por issue

### #30 — Workspace, registry e tema

- **Implementado:** Dockview integrado, catálogo de cinco componentes, estado vazio para painéis futuros e `session` real (`Workspace.tsx:160-168`, `panelRegistry.tsx:9-32`). `score` recebe renderer `always` (`Workspace.tsx:72-77`, `panelRegistry.tsx:29-32`). Tema e variáveis do Dossier estão em grande parte aplicados.
- **Parcial:** valores de tema principais conferem, mas há diferenças do watermark descritas na §1; o botão “+ Painel” do watermark é inerte (`panelRegistry.tsx:50-52`). Floating está habilitado.
- **Severidade:** baixa para diferenças visuais; média para o botão inerte do watermark. DnD nativo Windows: bloqueador até o ajuste de config ser validado em runtime.

### #31 — Persistência de layout

- **Implementado:** persiste `api.toJSON()` com debounce 500 ms e salva também no cleanup (`useLayoutPersistence.ts:11-29`). Escopo da obra é enviado apenas no modo sessão (`Workspace.tsx:48-52`). Layout salvo é restaurado e erros caem no plano padrão (`Workspace.tsx:102-137`).
- **Parcial/risco:** layout antigo salvo por obra pode explicar uma primeira visualização sem splits; o botão de reset existe. Blueprint AC-W4 exige `resetLayouts` remover somente chaves `workspace.layout.%`; não foi re-auditada a implementação da aplicação, fora da lista principal de módulos.
- **Acessibilidade:** chega-se ao reset pelo ícone “Layout” no cabeçalho → “Restaurar layout padrão” (`WorkspaceHeader.tsx:79-80`, `LayoutMenu.tsx:98-117`).
- **Severidade:** média se layout antigo persistido for confundido com regressão do arranjo padrão; persistência em si está implementada.

### #32 — AddPanelMenu, LayoutMenu e WorkspaceHeader

- **Implementado:** singleton já aberto recebe foco (`AddPanelMenu.tsx:9-22`); menu de layout move, junta e flutua painel ativo, além de restaurar layout (`LayoutMenu.tsx:24-95,115-151`). Atalhos Ctrl+1…5 existem (`AddPanelMenu.tsx:25-61`). O header tem 56 px e controles de sessão (`WorkspaceHeader.tsx:59-87`).
- **Parcial:** menu de painel fecha e permite Escape/setas, mas falta navegação completa por teclado no submenu de partitura; o submenu é um stub desabilitado (`AddPanelMenu.tsx:83-109,139-161`). “Mover para esquerda/direita/cima/baixo” cria split local se não houver grupo adjacente (`LayoutMenu.tsx:27-60`), enquanto “juntar ao grupo ativo” seleciona o primeiro grupo diferente, que pode não ser o esperado (`:41-45`).
- **Header:** faltam indicador de gravação real, pílula funcional do metrônomo e estado visual de pausa; dependem das Fases 6/8. “Finalizar” abre diálogo e usa caso de uso real.
- **Acessibilidade:** em Workspace, abrir “Layout” e escolher ação dispensa DnD; para adicionar painel, “+ Painel” e atalhos. Nenhum caminho da sidebar abre `/practice/new` (ver #33).
- **Severidade:** médio para lacunas de navegação por teclado/ação de juntar ambígua; baixa para indicadores dependentes de fases futuras.

### #33 — Setup de prática, PracticePage e ToolsPage

- **Implementado:** rotas `/practice/new`, `/practice/:sessionId`, `/tools` (`router.tsx:42-44`); setup carrega obras/objetivos, valida BPM, chama `startSession` e navega para a sessão (`PracticeSetupPage.tsx:25-69,71-117`); ToolsPage abre Workspace livre (`ToolsPage.tsx:4-6`). No modo livre, catálogo não oferece `recorder`/`session` (`workspace.ts:2-11`, `AddPanelMenu.tsx:78-82`).
- **Implementado mas inacessível pela navegação visível:** não há `NavLink`/ação para `/practice/new`; a navegação definida em `AppShell.tsx:10-16,52-57` contém Ferramentas, mas não Nova sessão. Portanto PracticeSetup só é alcançável digitando a rota/hash; a partir da UI não se inicia fluxo novo. Isso é gap alto de produto.
- **Stub intencional:** seleção de partituras do menu indica Fase 9 (`AddPanelMenu.tsx:139-161`).
- **Severidade:** alta para o fluxo `/practice/new` inacessível pela UI; seleção de partituras não é bug nesta fase.

### #34 — Controles de sessão, heartbeat e recovery

- **Implementado:** pausar/retomar/finalizar ligados aos casos de uso (`WorkspaceHeader.tsx:43-57,81-87`); relógio ativo atualiza por segundo (`useSessionClock.ts:4-11`); heartbeat a cada 20 s (`useHeartbeat.ts:5-11`); `boot()` chama `recoverOnBoot` (`boot.ts:14-18`). Banner de sessão aberta é exibido fora do Workspace e navega à sessão (`AppShell.tsx:24-43,61-64`).
- **Limite real:** o banner é “Retomar”; se sessão está ACTIVE, não chama `resumeSession`, apenas navega (`AppShell.tsx:34-41`). Recovery de sessão ocorre no boot, mas `recoverOnBoot` retorna `recoveredTakes: 0` fixo (`sessions.ts:165-174`), limitação já registrada no AGENTS.md §13 e dependente da Fase 8 para takes. AC-10 é parcialmente demonstrado; não há prova de build Windows.
- **Severidade:** média para recovery de takes, pois contrato reporta zero; baixa para texto/ação do banner. Fases futuras para take recovery.

### #35 — SessionPanel real

- **Implementado:** objetivo pode ser trocado/concluído/reaberto e notas chamam `updateSessionNotes` com autosave (`SessionPanel.tsx:26-76,95-100`). Funciona com sessão recebida pelo parâmetro Dockview (`Workspace.tsx:87-90,115-118`). UI limita a 2000 caracteres (`maxLength`, linha 96), impedindo exceder pelo textarea.
- **Não comprovado integralmente:** a issue exigia exceder 2000 rejeitado pela UI com mensagem de validação do domínio. `maxLength=2000` bloqueia digitação extra, mas não apresenta a mensagem de validação do domínio; falta cenário de colagem/programmatic state acima do limite. Severidade baixa/média; o limite de dados é respeitado, critério literal da mensagem não.
- **Acesso:** iniciar/abrir sessão; no Workspace da sessão, painel “Sessão” vem no layout padrão, ou pode ser reaberto via “+ Painel”/Ctrl+5.

## 3. Dockview DnD no Windows

### Hipótese `dragDropEnabled`

**Confirmada no schema instalado e fix aplicada.** `node_modules/@tauri-apps/cli/config.schema.json:270-280` declara `app.windows[].dragDropEnabled`, default `true`, mapeia para `WebviewBuilder::disable_drag_drop_handler` e afirma explicitamente: desabilitar é necessário para HTML5 drag-and-drop no frontend no Windows porque Tauri substitui o handler de drag/drop do WebView2. A versão Rust fixada é `tauri = 2.12.1` (`src-tauri/Cargo.toml`); a CLI schema instalada é a evidência local consultada. A documentação também distingue esse campo de `WindowBuilder::drag_and_drop` (drop nativo de arquivos versus eventos HTML).

Foi definido `"dragDropEnabled": false` em `src-tauri/tauri.conf.json:20`. O arquivo `tauri.microsoftstore.conf.json` apenas sobrescreve `bundle.windows.webviewInstallMode`, não define janela; portanto herda o valor da configuração base e não precisa de duplicação.

O app importa partituras via diálogo nativo Rust e não depende de soltar arquivos do Explorer na janela (capability sem permissões de diálogo no webview: `src-tauri/capabilities/default.json:6-11`). Assim, não há custo de fluxo conhecido. A causalidade final ainda requer build e teste manual Windows: abas devem arrastar, drop zones devem aparecer, split deve funcionar e floating deve abrir.

### Outros candidatos avaliados

- **Floating:** Dockview não está com floating desabilitado (`Workspace.tsx:160-166`); menu Layout também chama `addFloatingGroup` (`LayoutMenu.tsx:82-95`). Não parece ser ausência da feature.
- **CSS/hit testing:** overlay e sash não têm `pointer-events: none` exceto pseudo-elementos decorativos; estes explicitamente não capturam eventos (`workspace-theme.css:128-138,186-195`). O z-index 2 do header e menus em 20 ficam fora da área das abas e não cobrem o conteúdo inteiro (`workspace-theme.css:8-19,45-55`). Não achei causa CSS geral para bloquear DnD.
- **CSP/capabilities:** CSP em `tauri.conf.json:23-25` permite scripts locais e style inline, sem regra relacionada a HTML DnD. Capability não bloqueia eventos DOM. Não candidato provável.
- **Layout salvo:** Dockview restaura layout persistido antes do padrão (`Workspace.tsx:102-129`); reset é necessário para eliminar layouts criados antes do plano em grupos. Explica ausência de split no arranjo inicial, mas não explica abas não arrastarem.
- **Ambiente/build:** a config nova exige rebuild/reinstalação do app Windows; reiniciar uma instalação já empacotada não incorpora a mudança.

**Severidade:** bloqueador para interação DnD em Windows antes do patch; agora mitigado por configuração, pendente de validação AC-M7. Possíveis falhas residuais após rebuild seriam alta severidade e devem ser isoladas primeiro confirmando a versão instalada e o handler ativo.

## 4. Stubs intencionais / fases futuras

- `metronome`, `tuner` e `recorder`: títulos e estado vazio em `panelRegistry.tsx:9-15`; respectivamente Fases 6, 7 e 8 do Blueprint.
- `score`: painel vazio e `renderer: always` configurado (`panelRegistry.tsx:29-32`); leitor/importação/PDF na Fase 9.
- Seleção de score no AddPanelMenu apresenta explicitamente “chega na Fase 9” (`AddPanelMenu.tsx:155-160`); stub intencional da #33.
- Indicadores REC/metrônomo no header dependem das Fases 6 e 8.
- Recovery de take permanece placeholder conhecido (`sessions.ts:173`), aguardando regra/implementação real de áudio da Fase 8.

## 5. Achados e severidade

| Severidade | Achado |
|---|---|
| **Bloqueador (mitigado, validar)** | Handler Tauri default impedia HTML5 DnD em Windows; `dragDropEnabled: false` agora configurado. Requer rebuild e AC-M7 manual. |
| **Alta** | `/practice/new` existe mas não há entrada visível para iniciar nova sessão. |
| **Alta (já rastreada #86)** | AppShell ainda usa sidebar vertical, divergindo da navegação Atril final. Não duplicado como novo achado. |
| **Média** | Botão “+ Painel” do watermark não abre menu; limita ação de watermark prevista no Dossier. |
| **Média** | Recovery não recupera takes e relata `recoveredTakes: 0`; conhecida e dependente da Fase 8. |
| **Média/baixa** | Ações do Layout para juntar grupo podem escolher o primeiro grupo diferente; submenu de partitura não tem interação completa por teclado. |
| **Baixa** | Diferenças cosméticas do card de sessão e watermark, e falta de valores CSS explícitos para ghost/tempo easing do overlay. |
| **Baixa** | AC-11b limita nota a 2000 caracteres, porém não apresenta a mensagem de domínio ao atingir/colar além do limite; a validação de aplicação não foi re-auditada nesta tarefa. |

## Validação executada

- `bun run lint` — **passou** (ESLint encerrou com código 0; o volume montado demorou mais de 1 minuto).
- `bun run typecheck` — **passou** (`tsc --noEmit`, código 0).
- JSON de `tauri.conf.json` — parse local e validação pelo schema da CLI Tauri.
- `bun run tauri build` deliberadamente não executado; build Windows real e AC-M7 permanecem pendentes.
