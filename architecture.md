# Architecture

## Overview

Two Electron processes communicate over IPC. The main process owns OS-level concerns (screen capture, hotkeys, window management, AI calls). The renderer process is the React UI running inside the invisible overlay window.

```
┌─────────────────────────────────────────────────────┐
│                  Electron Main Process               │
│                                                     │
│  ┌──────────┐   ┌──────────┐   ┌─────────────────┐ │
│  │ Hotkeys  │──▶│ Capture  │──▶│   AI Backend    │ │
│  │ (global  │   │(desktop  │   │                 │ │
│  │ shortcut)│   │Capturer) │   │ ┌─────────────┐ │ │
│  └──────────┘   └──────────┘   │ │ claude-cli  │ │ │
│                                │ ├─────────────┤ │ │
│  ┌──────────────────────────┐  │ │  codex-cli  │ │ │
│  │     Window Manager       │  │ ├─────────────┤ │ │
│  │  - overlay BrowserWindow │  │ │ gemini-cli  │ │ │
│  │  - setContentProtection  │  │ └─────────────┘ │ │
│  │  - always-on-top         │  └─────────────────┘ │
│  └──────────────────────────┘  └─────────────────┘ │
│              │  IPC (ipcMain / ipcRenderer)          │
└──────────────┼──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              Electron Renderer Process               │
│              (Overlay BrowserWindow)                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                React App                    │   │
│  │                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Toolbar  │  │  Answer  │  │ FollowUp │  │   │
│  │  │(hide/clr)│  │(streamed │  │  input   │  │   │
│  │  │          │  │+ syntax  │  │          │  │   │
│  │  └──────────┘  │highlight)│  └──────────┘  │   │
│  │                └──────────┘                 │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Capture → Answer

```
1. User presses Cmd+Shift+Space
2. main/hotkeys.ts fires capture event
3. main/capture.ts calls desktopCapturer.getSources()
   → returns screenshot of the target window as NativeImage
4. Image converted to base64 PNG
5. main/ai/backend.ts routes to selected backend:

   [claude-cli]
     → spawn("claude", ["-p", prompt_with_base64_image])
     → pipe stdout chunks via IPC to renderer

   [codex-cli]
     → spawn("codex", [prompt])
     → pipe stdout chunks via IPC to renderer

   [gemini-cli]
     → write screenshot to a temporary PNG
     → spawn("gemini", ["--prompt", prompt_with_@capture_png, "--output-format", "json"])
     → send parsed response to renderer

6. Renderer receives stream chunks → appends to Answer component
7. Code blocks detected → syntax highlighted via shiki or prism
```

### Follow-up Question

```
1. User types in FollowUp input → presses Enter
2. Renderer sends ipcRenderer.invoke("followup", { text })
3. Main process appends to conversation history (messages array)
4. Same AI backend called with full history
5. Streams back to renderer
```

### Hide / Show

```
1. User presses Cmd+Shift+H (any time, even mid-stream)
2. main/hotkeys.ts calls overlayWindow.hide() or .show()
3. No IPC needed — pure main process operation
4. Window disappears from all screen capture immediately
```

## Invisible Window Implementation

```typescript
// main/index.ts
const overlay = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  hasShadow: false,
  webPreferences: { contextIsolation: true, preload: "..." }
})

// This is the key line — excludes from screenshare/recording on macOS
overlay.setContentProtection(true)

// Keep on top of everything including full-screen apps
overlay.setAlwaysOnTop(true, "screen-saver")
overlay.setVisibleOnAllWorkspaces(true)
```

## AI Backend Interface

All backends implement the same interface so they're swappable:

```typescript
interface AIBackend {
  sendMessage(
    systemPrompt: string,          // mode-specific instruction block
    messages: Message[],           // conversation history
    onChunk: (text: string) => void // streaming callback
  ): Promise<void>
}
```

### claude-cli backend
- Spawns `claude -p "<prompt>"` as child process
- Image passed as base64 embedded in prompt (Claude Code CLI supports this)
- Streaming: reads stdout line by line
- Auth: reuses Claude Code CLI's existing config (`~/.claude/`)
- Requires Claude Code CLI installed: `npm i -g @anthropic-ai/claude-code`

### codex-cli backend
- Spawns `codex "<prompt>"` as child process
- Streaming: reads stdout
- Auth: reuses Codex CLI config
- Requires Codex CLI installed: `npm i -g @openai/codex`

### gemini-cli backend
- Spawns `gemini --prompt "<prompt>" --output-format json` as a child process
- Screenshot is written to a temporary PNG and attached with Gemini CLI `@file` inclusion
- Uses the installed Gemini CLI login/session instead of an API key flow inside the app
- Returns the final JSON response to the renderer in a single streamed chunk
- Requires Gemini CLI installed: `npm i -g @google/gemini-cli`

## IPC Channels

| Channel | Direction | Payload | Description |
|---|---|---|---|
| `capture` | main → renderer | — | Trigger capture (from hotkey) |
| `stream:chunk` | main → renderer | `{ text: string }` | Streaming token |
| `stream:done` | main → renderer | — | Stream complete |
| `stream:error` | main → renderer | `{ error: string }` | Error |
| `followup` | renderer → main | `{ text: string }` | Follow-up question |
| `toggle` | main → renderer | `{ visible: boolean }` | Show/hide |
| `clear` | main → renderer | — | Clear conversation |
| `settings:get` | renderer → main | — | Fetch current settings |
| `settings:set` | renderer → main | `Partial<Settings>` | Update settings |

## Conversation State

Stored in main process memory (not persisted between app restarts):

```typescript
interface ConversationState {
  messages: Array<{
    role: "user" | "assistant"
    content: string
    imageBase64?: string  // only on first message of a capture
  }>
}
```

Cleared on `Cmd+Shift+X` or app restart.

## System Prompt Design

System prompts live in `src/main/ai/prompts.ts`. No user profile — prompts are mode-specific and cover everything an interviewer is likely to ask about.

### Coding mode prompt

```
You are a silent assistant helping someone during a live coding interview.
A screenshot of a coding problem will be provided.

Respond with exactly these sections:

**Approach**
One paragraph. Name the algorithm/pattern and why it fits. Mention the brute force
in one sentence if there is a meaningfully simpler alternative.

**Solution**
Clean, correct code. No scaffolding, no main(), just the function(s).

**Complexity**
- Time: O(...) — one line explanation
- Space: O(...) — one line explanation

**Edge Cases**
Bullet list of edge cases the solution handles (or the interviewer might ask about).

**Interviewer Follow-ups**
3-5 questions the interviewer is likely to ask next, with a one-line answer for each.

Rules:
- Be concise. The candidate is reading under pressure.
- Do not restate the problem.
- Default to the most interview-appropriate solution, not necessarily the most clever.
```

### System design mode prompt

```
You are a silent assistant helping someone during a live system design interview.
A screenshot of the design prompt will be provided.

Respond with exactly these sections:

**Components**
Bullet list of the key services/components and their single responsibility.

**Data Flow**
3-5 sentences describing how a request moves through the system end to end.

**Trade-offs**
The 2-3 most important design decisions to mention verbally, with the chosen approach
and what was sacrificed.

**Scale Estimates**
Quick numbers to cite: QPS, storage size, bandwidth. State assumptions.

**Interviewer Follow-ups**
3-5 questions likely to come next, with a one-line answer for each.

Rules:
- Format for fast scanning — the candidate will be talking while reading this.
- Prioritize depth on the hardest part of the design over breadth.
```

### Behavioral mode prompt

```
You are a silent assistant helping someone during a behavioral interview.
The candidate will type a behavioral question.

Answer in STAR format:
- **Situation** — 1-2 sentences of context
- **Task** — 1 sentence on what needed to be done
- **Action** — 3-4 specific bullet points on what the candidate did
- **Result** — 1-2 sentences with a concrete outcome

Rules:
- Write in first person so the candidate can read it directly.
- Stay under ~300 words (2 minutes of speech).
- Use [placeholder] for specifics you cannot know (project name, company name, metrics).
- Do not invent facts.
```

### Prompt selection

```typescript
// src/main/ai/prompts.ts
export function getSystemPrompt(mode: InterviewMode): string {
  switch (mode) {
    case "coding":        return CODING_PROMPT
    case "system-design": return SYSTEM_DESIGN_PROMPT
    case "behavioral":    return BEHAVIORAL_PROMPT
  }
}
```

The system prompt is passed as the `system` parameter on every API call and prepended to the conversation for CLI backends.

## Security Notes

- `contextIsolation: true` on renderer — no direct Node access from React
- Preload script exposes only a typed `window.api` surface via `contextBridge`
- No external network calls except to AI provider APIs
