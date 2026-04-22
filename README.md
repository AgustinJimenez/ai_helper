# Interview Helper

Interview Helper is an Electron desktop overlay for technical interviews. It captures the current screen, sends the prompt to a configured AI backend, and streams the response into a floating overlay window that stays visible to you while remaining excluded from screen sharing on macOS.

## Prerequisites

- macOS
- Node.js 20+ and npm
- One configured AI backend:
  - `claude-cli` (default): install Claude Code and ensure the `claude` command works
  - `codex-cli`: install Codex CLI and ensure the `codex` command works
  - `claude-sdk`: provide `ANTHROPIC_API_KEY` or enter a key in the app settings

## Install

```bash
npm install
```

## Run in Development

Start the Electron + Vite dev environment:

```bash
npm run dev
```

Useful companion commands:

```bash
npm run lint        # Run ESLint across main, preload, and renderer code
npm run typecheck   # Validate TypeScript in main, preload, and renderer
npm run check       # Run lint and typecheck together
npm run build       # Produce a production build in out/
```

### macOS Permissions

This app captures the screen, so macOS Screen Recording permission is required.

- In development, Electron typically inherits Terminal permissions.
- For packaged builds, grant permission to the built app itself.
- If capture fails, open **System Settings → Privacy & Security → Screen Recording** and enable access.

## Build and Package

Create a production build:

```bash
npm run build
```

Package the app as a macOS DMG:

```bash
npm run package
```

Build output goes to `out/`. Packaged artifacts are written to `dist/`.

## Backend Notes

- **Claude CLI**: best default for local usage; selected by default in `src/main/settings.ts`.
- **Codex CLI**: works through the installed `codex` binary.
- **Claude SDK**: uses the Anthropic SDK directly and supports image input plus streaming.

## Project Structure

```text
src/main/         Electron main process, hotkeys, capture, AI orchestration
src/preload/      Secure IPC bridge
src/renderer/src/ React overlay UI
src/shared/       Shared TypeScript types
architecture.md   Architecture and data-flow notes
```

## Default Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run check
npm run build
npm run preview
npm run package
```
