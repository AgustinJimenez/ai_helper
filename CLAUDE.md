# AI Helper

A desktop overlay tool focused on Claude Code, OpenAI Codex, and Gemini CLI. It captures the current screen, sends the prompt to the selected AI backend, and streams the response into an overlay that is visible to the user while remaining excluded from screen sharing software such as Zoom, Meet, and Teams.

## What It Does

- Hotkey triggers a screenshot of the interview window
- Screenshot is sent to an AI backend (Claude Code CLI, Codex CLI, or Gemini CLI)
- Answer streams back into a floating overlay window
- Overlay is invisible to screen capture / screenshare
- User can ask follow-up questions in a running conversation

## Stack

- **Framework:** Electron (Node.js + Chromium)
- **UI:** React + Tailwind CSS
- **AI:** Pluggable backend — Claude Code CLI, OpenAI Codex CLI, or Gemini CLI
- **Screen capture:** Electron `desktopCapturer` API
- **Invisible overlay:** `BrowserWindow.setContentProtection(true)` (macOS)
- **Hotkeys:** `electron-globalShortcut`

## Platform

macOS first. `setContentProtection` is macOS-specific. Windows support is out of scope for now.

## Key Features

- **Invisible overlay** — window excluded from all screenshare/recording via `setContentProtection(true)`
- **Panic hotkey** — instantly hide/show overlay
- **Capture hotkey** — trigger screenshot and AI call
- **Streaming responses** — answer streams token by token, no waiting
- **Multi-turn conversation** — follow-up questions keep context
- **Movable/resizable overlay** — user positions it freely
- **Syntax highlighting** — code blocks rendered with highlighting
- **Multiple AI backends** — switchable without restart
- **Problem types** — coding (screenshot), system design (screenshot), behavioral (text input)
- **Interview mode** — per-session switch (coding / system design / behavioral) that changes the system prompt

## Hotkeys (defaults, configurable)

| Action | Default |
|---|---|
| Capture screenshot + ask | `Cmd+Shift+Space` |
| Show / hide overlay | `Cmd+Shift+H` |
| Clear conversation | `Cmd+Shift+X` |

## Project Structure

```
ai-helper/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # App entry, window creation
│   │   ├── capture.ts      # Screen capture logic
│   │   ├── hotkeys.ts      # Global shortcut registration
│   │   └── ai/
│   │       ├── backend.ts  # Backend interface
│   │       ├── prompts.ts  # System prompt templates per mode
│   │       ├── claude-cli.ts
│   │       ├── codex-cli.ts
│   │       └── gemini-cli.ts
│   ├── renderer/           # React UI (overlay)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Answer.tsx
│   │   │   ├── FollowUp.tsx
│   │   │   └── Toolbar.tsx
│   │   └── index.tsx
│   └── shared/             # Types shared between main/renderer
│       └── types.ts
├── CLAUDE.md
├── architecture.md
├── package.json
└── electron-builder.config.js
```

## Dev Commands

```bash
npm install
npm run dev        # Start Electron in dev mode with hot reload
npm run build      # Build for production
npm run package    # Package into .app
```

## Environment / Config

Settings are stored in Electron's userData directory.

```
backend: "claude-cli" | "codex-cli" | "gemini-cli"
overlayOpacity: number (0.0 - 1.0)
overlayPosition: { x, y, width, height }
hotkeys: { capture, toggle, clear }
interviewMode: "coding" | "system-design" | "behavioral"
```

## System Prompts

See `src/main/ai/prompts.ts` for full templates. No user profile needed — prompts are mode-specific and focused purely on what an interviewer will ask about.

**Coding mode** — solution, explanation of approach, time + space complexity, edge cases, likely interviewer follow-ups.

**System design mode** — components, data flow, trade-offs, scale estimates, likely follow-ups.

**Behavioral mode** — STAR-format answer, concise enough to speak in ~2 minutes.

## AI Backend Notes

- **claude-cli**: Shells out to the installed `claude` command and reuses Claude Code CLI auth.
- **codex-cli**: Shells out to the installed `codex` command and reuses Codex CLI auth.
- **gemini-cli**: Shells out to the installed `gemini` command, reuses Gemini CLI auth, and passes screenshots as temporary PNG attachments via `@file` references.
