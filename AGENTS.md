# Repository Guidelines

## Project Structure & Module Organization
- `src/main/` contains Electron main-process logic: windows, hotkeys, capture, settings, and AI backends.
- `src/preload/` exposes the IPC bridge to the renderer. Keep it thin and security-focused.
- `src/renderer/src/` holds the React overlay UI; reusable UI lives in `src/renderer/src/components/`.
- `src/shared/` stores cross-process TypeScript types. Update shared contracts here first when IPC payloads change.
- `out/` and `dist/` are generated artifacts. Architecture notes live in `architecture.md` and `CLAUDE.md`.

## Build, Test, and Development Commands
- `npm install` installs Electron, React, and build tooling.
- `npm run dev` starts the Electron + Vite development environment with reload.
- `npm run lint` runs ESLint across the repo and should stay warning-free.
- `npm run typecheck` runs TypeScript checks for both the main/preload and renderer projects.
- `npm run check` runs the expected local validation pass (`lint` + `typecheck`).
- `npm run build` creates a production build in `out/`.
- `npm run package` builds and packages the macOS app into `dist/`.

## Coding Style & Naming Conventions
- Use TypeScript throughout. Match the existing style: single quotes, no semicolons, and sparse comments.
- Use `PascalCase` for React component files (`Toolbar.tsx`), `camelCase` for functions/variables, and descriptive lowercase filenames for main-process modules (`capture.ts`, `settings.ts`).
- Keep process boundaries clean: OS integrations stay in `src/main/`, UI state stays in the renderer, and shared interfaces belong in `src/shared/types.ts`.
- Prefer Tailwind utility classes in JSX, and keep IPC channel names explicit and stable.

## Testing Guidelines
- There is no dedicated automated test suite yet. At minimum, run `npm run check` before submitting changes.
- Manually verify the affected flow in `npm run dev`, especially capture, streaming, follow-up prompts, and overlay visibility on macOS.
- If you add tests, place them near the feature they cover and document the new command in `package.json`.

## Commit & Pull Request Guidelines
- Git history is not included in this checkout, so follow a simple imperative style such as `Add countdown cancel on capture`.
- Keep commits focused. Separate renderer, main-process, and packaging changes when practical.
- PRs should include a short summary, manual verification steps, and screenshots or GIFs for UI changes. Call out any macOS permission, packaging, or keychain impacts.

## Security & Configuration Tips
- Never commit API keys or local settings. Secrets belong in the macOS Keychain, and runtime settings stay in Electron user data.
- Treat screen-capture and IPC changes as sensitive: preserve `contextIsolation`, avoid widening the preload surface, and re-check content protection after window changes.
