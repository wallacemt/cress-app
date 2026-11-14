# Cress

Cress is a desktop app for musical practice, built with Tauri and React.

## Prerequisites

- Windows 10 or 11 (native Windows is the official development environment; see ADR-04).
- Node.js 24 LTS, used for supporting tools; Bun is the main runtime and package manager.
- [Bun](https://bun.sh/).
- Rust stable 1.90 or later, with the MSVC Build Tools installed.
- WebView2 Runtime, usually included with an up-to-date Windows 10 or 11 installation.

WSL and Linux can run automated tests, but cannot run `tauri dev` or `tauri build` for the real app. Use native Windows to develop and run Cress with its audio hardware.

## Setup

From the project directory, install dependencies and start the development app:

```powershell
bun install
bun run tauri:dev
```

## Useful scripts

- `bun run check` — full local quality gate: lint, typecheck, JavaScript tests, Rust tests, and Clippy.
- `bun run lint` — lint the project.
- `bun run typecheck` — check TypeScript types.
- `bun run test` — run JavaScript/TypeScript tests.
- `bun run test:rust` — run Rust tests.

## Development app data

Development uses a separate Tauri identifier configured in `src-tauri/tauri.dev.conf.json`. This keeps the development app's SQLite database in a separate `app_data_dir` from the installed production app, preventing both from sharing the same database.
