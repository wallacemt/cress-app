# Pendências antes da publicação na MS Store

Itens conhecidos, adiados de propósito. Tratar **depois de fechar as milestones de feature** (7–11) e **antes** de submeter ao Partner Center (Milestone 12). Origem: `AGENTS.md` §9, `AUDIT-milestone5.md` e revisão da Milestone 6.

## 1. Validação manual no Windows (não reproduzível no WSL)

- [ ] **AC-M7** — DnD do Workspace (arrastar aba, drop zones, split, floating). Fix `dragDropEnabled: false` aplicado, sem validação em runtime. Exige rebuild + reinstalação.
- [ ] **AC-M1** — Metrônomo 120 BPM por 5 min, janela minimizada; fechar o painel não pode parar o som. O bundle próprio do worklet (rolldown) ainda não foi testado em WebView2 real fora do teste inicial.

## 2. Metrônomo (Fase 6) — lacunas

- [ ] Volume do painel é só visual: `engine.ts` não tem `GainNode`.
- [ ] `audioSuspended` no `metronomeStore` nunca é setado; banner "áudio suspenso pelo sistema" (Dossier §8.4) não implementado.
- [ ] `engine.start()` não protege contra `connect()` duplicado se chamado duas vezes sem `stop()` (mitigado pela store).

## 3. Workspace / sessão (Fase 5) — achados da auditoria

- [ ] **Alta:** confirmar que `/practice/new` tem entrada visível na navegação Atril (o PR #88 pode ter resolvido) e fechar a issue #86.
- [ ] **Média:** botão "+ Painel" do watermark está inerte (`panelRegistry.tsx`) — ligar ao `AddPanelMenu`.
- [ ] **Média:** `recoverOnBoot` retorna `recoveredTakes: 0` fixo. Definir a regra real de recuperação de take `RECORDING` após crash (decidir na Fase 8 com hardware real).
- [ ] **Média/baixa:** "juntar ao grupo ativo" escolhe o primeiro grupo diferente (`LayoutMenu.tsx`); submenu de partitura sem navegação completa por teclado.
- [ ] **Baixa:** banner de sessão aberta só navega, não chama `resumeSession` quando a sessão está ACTIVE.
- [ ] **Baixa:** SessionPanel — `maxLength=2000` não exibe a mensagem de validação do domínio (AC-11b); card sem `ink-750`/radius 8; falta check animado de objetivo concluído.
- [ ] **Baixa:** watermark/overlay — ghost 85% da aba e easing 120 ms sem regra CSS explícita; floating sem tamanho inicial 320×340.

## 4. Qualidade e release (antes da Milestone 12)

- [ ] Issues #61 (erros/estados vazios/`prefers-reduced-motion`), #62 (ícones), #63 (build NSIS + `tauri.microsoftstore.conf.json`), #64 (README + roteiro manual AC-M*).
- [ ] Roteiro manual completo (todos os AC-M*) no Windows 10/11 com build de release.
- [ ] Gerar `.msix` real (AGENTS.md §5): `tauri build` → extrair MSI → `AppxManifest.xml` à mão → `makeappx pack`. Não assinar localmente.
- [ ] Revisões de segurança Lawliet (a) #44, (b) #49, (c) #57 concluídas.
- [ ] Distribuição (#65–#72): política de privacidade, Partner Center, ficha de listagem, pipeline MSIX, updater. `identifier`/`publisher` são imutáveis após a primeira publicação (ADR-20).

## 5. Ambiente

- [ ] Instalar `libasound2-dev` no WSL (`sudo apt-get install -y libasound2-dev`) para `cargo check` local; o CI já cobre.
- [ ] Vitest DOM no WSL dá `Timeout waiting for worker` com frequência — repetir antes de concluir que há regressão.
