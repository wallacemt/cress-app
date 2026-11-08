# Issue #55 — decisões e validação

- `composer`: mantido em estado local da prévia; não foi adicionado a `ImportCandidate`. A importação atual cria obras com `composer: null`, então o valor digitado não é persistido. Para salvar compositor é necessário ampliar o contrato de `importPlan`/repositório.
- Progresso: barra determinada usando `{done,total}` já emitido pelo comando Rust; `importPlan` ganhou callback opcional.
- Duplicatas/importados: os arquivos desmarcados exibem “Não será importado”; `probableDuplicate` exibe separadamente o caminho conhecido. O domínio não informa motivo para `selected: false` nos demais casos.
- ADR-17: Rust retorna somente `rootName`; React usa o mesmo texto como `rootPath`, nunca o caminho absoluto.
- Validação: `npx tsc --noEmit` passou; `bun run lint` passou com 0 erros e uma advertência preexistente em `RecorderPanel.tsx`; `bun run test -- --no-isolate src/application src/domain src/features/repertoire/ImportFolderDialog.dom.test.tsx` passou (73 testes/21 arquivos); `cargo check` passou. `cargo test scores::` e `cargo test paths::` ficaram bloqueados sem processo Rust ativo no ambiente 9p/WSL e foram encerrados. `git diff --check` passou.
