# LevelUp PWA – Developer Guidebook

## Overview

**LevelUp** is a personal habit-building Progressive Web App (PWA) inspired by RPG mechanics. It runs entirely **offline**, stores data locally using IndexedDB, and can be installed on iOS or desktop. The app helps users complete daily and weekly "quests" to earn XP and gold, level up classes, and maintain habits.

---

## 📚 Documentation Strategy (How to Work with an AI Assistant)

To keep things simple (solo, hobby-scale) and effective for AI assistance, use a **two-layer doc stack**:

**Layer 1 — Guidebook (this file):**

* Audience: you and AI assistants.
* Purpose: source of truth for goals, scope, data model, UX, and rules.
* What it contains: product goals, architecture choices, UI patterns, game logic, controls, PWA rules.

**Layer 2 — Feature Sheets (one per feature):**

* Audience: AI assistant during implementation.
* Purpose: precise, build-ready instructions for a single feature.
* Form: small markdown files stored next to code (e.g., `/docs/features/weekly-bundle.md`).

### Recommended Workflow

1. **Create/Update** a Feature Sheet using the template below.
2. Ask the AI assistant to **implement exactly that sheet** (and only that sheet).
3. Run, test against the **Definition of Done**, and commit with a short **Decision Log** entry.
4. If something important changes, update the **Guidebook** (Layer 1).

### Feature Sheet Template

```
# Feature: <name>
## Goal
One paragraph: what problem this solves.

## User Story
“As a <role>, I want <action> so that <benefit>.”

## Scope (In/Out)
- In: …
- Out: …

## UX Notes
- Screens / components affected
- States & empty states
- Controls (use Quest Card Controls spec)

## Data & Contracts
- Tables/fields touched
- Functions/APIs (input/output)

## Logic
- Step-by-step rules (bullet list)
- Edge cases

## Acceptance (Definition of Done)
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] QA checklist

## Test Ideas
- Unit/logic
- Manual checks

## Follow-ups
- Nice-to-have / later
```

### Prompt Recipe for AI

```
You are implementing the feature described in /docs/features/<file>.md.
Follow the Guidebook rules. Modify only the necessary files. Write clean React+TS, Tailwind styles, and Dexie queries. Add small unit tests when reasonable. Explain what you changed and why.
```

---

## 🎯 Core Goals

* Fully offline operation after first load
* Persistent local data (Dexie + IndexedDB)
* Smooth iOS-style UI (TailwindCSS + Framer Motion)
* Installable PWA via browser (no App Store)
* Simple internal logic for personal/hobby use

---

## 🧱 Tech Stack

* **Framework:** React 18 + TypeScript + Vite
* **Styling:** Tailwind CSS (+ optional shadcn/ui for components)
* **Local Storage:** Dexie (IndexedDB wrapper)
* **PWA:** vite-plugin-pwa (Workbox)
* **Animation:** Framer Motion (for smooth transitions)
* **Testing:** Vitest (optional)

---

## 🗂 App Structure

### Tabs

1. **Home** – Main dashboard showing all classes, their quests, and the current weekly quest bundle.
2. **Quests** – Lists all quest templates (daily + weekly anchors) with enable toggles and basic editing.
3. **Settings** – Basic settings, data export/import, debug actions.

### Optional Future Tab

* **Collectables** – Placeholder for achievements or streak rewards (not required now).

---

## 🗺️ Implementation Roadmap & Milestones

> **Principle:** *Visual-first*, with **two logic-first exceptions** where back-end rules strongly shape the UI.
>
> **Logic‑first exceptions:**
>
> 1. **Quest Picker Engine** (daily assignment/rules) — build the selection logic before wiring advanced ClassCard interactions.
> 2. **Weekly Bundle Generation** — build the generator/selection rules before finalizing the Weekly card UI.

### M0 — Project Scaffold (1 day)

**Goal:** Running PWA shell with offline support.

* Create Vite React+TS app; add Tailwind, Dexie, vite-plugin-pwa.
* Add bottom tab nav (Home, Quests, Settings) and basic routing.
* PWA manifest & service worker (autoUpdate); confirm offline reload.
  **Deliverables:** App installs to Home Screen; offline page works.

#### Step-by-step — Initial Project Setup

> Assumes Node LTS (≥18) and npm.

**1) Scaffold & install deps**

```bash
# scaffold
npm create vite@latest levelup -- --template react-ts
cd levelup

# runtime deps
npm i dexie

# UI & styling
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# PWA & motion (React)
npm i -D vite-plugin-pwa
npm i framer-motion
```

**2) Tailwind config**

```js
// tailwind.config.cjs (or .js)
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: { '2xl': '1.25rem' },
    },
  },
  plugins: [],
}
```

```css
/* src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
html, body, #root { height: 100%; }
body { @apply bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100; }
```

**3) Vite + PWA config**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LevelUp',
        short_name: 'LevelUp',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
```

**4) Wire entry files**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

```tsx
// src/App.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Home from './ui/home/Home'
import QuestsTab from './ui/quests/QuestsTab'
import SettingsTab from './ui/settings/SettingsTab'

const tabs = ['Home','Quests','Settings'] as const
export type Tab = typeof tabs[number]

export default function App(){
  const [tab, setTab] = useState<Tab>('Home')
  return (
    <div className="mx-auto flex h-full max-w-screen-sm flex-col">
      <div className="flex-1 p-3">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.15}}>
            {tab==='Home' && <Home/>}
            {tab==='Quests' && <QuestsTab/>}
            {tab==='Settings' && <SettingsTab/>}
          </motion.div>
        </AnimatePresence>
      </div>
      <nav className="sticky bottom-0 grid grid-cols-3 border-t bg-white/90 p-2 backdrop-blur dark:bg-slate-900/90">
        {tabs.map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`rounded-xl py-2 text-sm font-medium ${tab===t? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t}</button>
        ))}
      </nav>
    </div>
  )
}
```

**5) Minimal pages**

```tsx
// src/ui/home/Home.tsx
export default function Home(){
  return <div className="space-y-3">
    <div className="rounded-2xl border p-4 shadow-sm">Weekly (placeholder)</div>
    <div className="rounded-2xl border p-4 shadow-sm">ClassCard (placeholder)</div>
  </div>
}
```

```tsx
// src/ui/quests/QuestsTab.tsx
export default function QuestsTab(){
  return <div className="rounded-2xl border p-4 shadow-sm">Quest Templates (placeholder)</div>
}
```

```tsx
// src/ui/settings/SettingsTab.tsx
export default function SettingsTab(){
  return <div className="rounded-2xl border p-4 shadow-sm">Settings (placeholder)</div>
}
```

**6) Dexie scaffold**

```ts
// src/db/db.ts
import Dexie, { Table } from 'dexie'

export interface User { id: string; gold: number }
export class DB extends Dexie {
  users!: Table<User>
  constructor(){
    super('levelup-db')
    this.version(1).stores({ users: 'id' })
  }
}
export const db = new DB()
```

**7) Maintenance hook (placeholder)**

```ts
// src/logic/maintenance.ts
import { useEffect } from 'react'
export function useMaintenance(){
  useEffect(()=>{
    const tick = () => console.log('Maintenance tick')
    tick()
    const id = setInterval(tick, 60_000)
    const onVis = () => document.visibilityState==='visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  },[])
}
```

(Add `useMaintenance()` inside `Home` for now.)

**8) Run & verify**

```bash
npm run dev
```

* App loads, tabs switch, basic cards render.
* Install to Home Screen (Safari → Share → Add to Home Screen).
* Go offline → refresh → app still loads (precached).

### M1 — Design System & Class Colors

**Goal:** App-wide look & feel.

* Tailwind tokens (radius, shadows), base typography, spacing.
* Pastel class accents (see Class Colors) + light/dark basics.
* Shared components: Card, Button, Switch, ProgressBar.
  **Deliverables:** Style guide page or Storybook-lite route with components.

### M2 — Class Card (UI only)

**Goal:** Pixel-true **ClassCard** per mock.

* Header (emoji, name, subtitle, level + XP bar).
* Empty slot tiles (locked/unlocked states).
* Quest card container (no real data yet), buttons stubbed.
  **Deliverables:** Home shows a static class list that matches design.

### M3 — Dexie Schema & Seed

**Goal:** Real local data.

* Implement DB schema from Guidebook; add seed script (1 user, 2–3 classes, 6–10 templates).
* Hook Home to Dexie queries; render ClassCard from data.
  **Deliverables:** Reload persists data.

### M4 — Quest Templates (CRUD + Enabled)

**Goal:** **Quests tab** finished visually & functionally.

* List daily + weekly anchor templates with **Enabled** toggle.
* Create/Edit/Delete modal forms.
* Validation and empty states.
  **Deliverables:** Templates survive reload; toggles stored.

### M4.5 — Quest Picker Engine (logic‑first)

**Goal:** Deterministic, testable selection of daily quests.

* Implement `pickEnabledDailyTemplates(count)` with shuffling and fallbacks.
* Add `assignDailyQuestsForClass(cls)` (no UI coupling; returns assigned quest IDs).
* Unit tests: ensures only **enabled** templates are picked; handles low-supply gracefully.
  **Deliverables:** Pure functions + tests; manual debug route prints selection.

### M5 — Quest Card Controls (UI + interactions) (UI + interactions)

**Goal:** Controls feel great.

* Implement center button two-step (Fill → Collect Reward).
* +/- with **press-and-hold acceleration**.
* Tap **X / Y** opens numpad entry.
* Animations & accessibility (aria-labels, focus).
  **Deliverables:** Controls fully working on dummy data.

### M6 — Daily Assignment & Reset (per class)

**Goal:** Real daily flow.

* `assignDailyQuestsForClass` uses **enabled** templates.
* `dailyResetForClass` replaces expired, resets uncompleted progress.
* `useMaintenance()` checks on open/foreground + every 60s.
  **Deliverables:** New day behavior verified by forcing date or debug button.

### M7 — Weekly Bundle (global)

**Goal:** Weekly engine + UI.

* **M7a (logic‑first):**

  * Implement `upsertWeeklyBundle()`:

    * If **enabled anchor** exists → 1 anchor + 2–3 daily templates.
    * Else → 4–5 daily templates.
  * Implement `claimWeeklyReward()` (2× bonus; XP→all classes, Gold→user).
  * Unit tests for anchor vs. fallback and idempotent upsert.
* **M7b (visual):**

  * Weekly card UI mirrors ClassCard controls and state.
    **Deliverables:** Weekly card visible and claimable; tests pass.

### M8 — Reroll System + Slot Unlocks

**Goal:** Meta systems complete.

* Reroll cost formula; reroll uncompleted quests only.
* Weekly reset clears reroll count.
* Unlock slots 3–5 with level requirements & gold costs.
  **Deliverables:** Reroll button and unlock modals functional.

### M9 — Scaling & Rewards polish

**Goal:** Numbers that feel right.

* Implement `scaledRequirement` & `scaledReward` usage.
* Show scaled requirement on quest cards; clamp progress.
  **Deliverables:** Visuals match math.

### M10 — Settings: Export/Import & Debug

**Goal:** Local-first safety nets.

* Export all tables to JSON; Import with confirmation.
* Debug: Force Daily / Weekly maintenance buttons.
  **Deliverables:** Roundtrip export/import tested.

### M11 — QA & Perf

**Goal:** Confidence and smoothness.

* Vitest for key logic (assignment, weekly pick, reroll cost, scaling).
* Basic Playwright flows: install PWA, offline launch, weekly rollover.
* Perf passes: memoize lists, avoid unnecessary renders.
  **Deliverables:** Green tests; 60fps feel.

### M12 — Nice-to-haves (backlog)

* Theming per class card background; haptics on iOS.
* History of weekly bundles; simple analytics (local only).
* Achievements/streaks.

### Per‑Milestone AI Prompt

> “Implement **Milestone X** from the Guidebook Roadmap. Modify only files relevant to this milestone. Keep UI consistent with the design system. Write brief notes on changes. When done, list test steps matching the milestone Deliverables.”

---

## ⚙️ Class Colors

Each class should have a soft, pastel-inspired accent color for visual distinction. These colors should be gentle and not overly saturated, to maintain a calm, clean interface aesthetic.

| Class       | Color Theme                            |
| ----------- | -------------------------------------- |
| **Warrior** | Soft Red (pastel crimson or rose tone) |
| **Ranger**  | Soft Green (sage or mint tone)         |
| **Mage**    | Soft Blue (sky or lavender tone)       |
| **Bard**    | Soft Purple (mauve or lilac tone)      |
| **Sheep**   | Soft Grey (light warm grey tone)       |
| **Chef**    | Soft Yellow (cream or sand tone)       |
|             |                                        |
|             |                                        |

> These tones can be implemented using Tailwind’s 100–300 color range (e.g., `bg-red-200`, `bg-green-200`, etc.) for light themes, and their 700 counterparts for dark mode.

---

## ⚙️ Data Model

### Entities

```ts
QuestType = 'daily' | 'weekly';

QuestTemplate {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  baseXP: number;
  baseGold: number;
  level1Requirement?: number;
  level100Requirement?: number;
  isEnabled: boolean;
  isAnchor: boolean; // true for weekly anchors
}

Quest {
  id: string;
  templateId: string;
  title: string;
  description: string;
  type: QuestType;
  baseXP: number;
  baseGold: number;
  progress: number;
  completionDate?: string;
  parentClassId?: string;
}

QuestSlot {
  id: string;
  position: 1|2|3|4|5;
  isUnlocked: boolean;
  questId?: string;
  parentClassId: string;
}

CharacterClass {
  id: string;
  name: string;
  level: number;
  questSlotIds: string[];
  rerollCountThisWeek: number;
  lastQuestAssignmentDate?: string;
  lastRerollDate?: string;
}

User {
  id: string;
  gold: number;
}

WeeklyBundle {
  id: string;
  isoYear: number;
  isoWeek: number;
  createdAt: string;
  bonusMultiplier: number;
  questIds: string[];
  isCompleted: boolean;
}
```

### Slot Unlock Rules

| Slot | Unlock Condition | Cost     |
| ---- | ---------------- | -------- |
| 1–2  | Always unlocked  | Free     |
| 3    | Level ≥ 5        | 100 Gold |
| 4    | Level ≥ 10       | 200 Gold |
| 5    | Level ≥ 15       | 300 Gold |

---

## 💾 Local Storage Setup (Dexie)

```ts
// db.ts
import Dexie from 'dexie';

export class LevelUpDB extends Dexie {
  users; classes; slots; templates; quests; weeklyBundles;
  constructor() {
    super('levelup-db');
    this.version(1).stores({
      users: 'id',
      classes: 'id, lastQuestAssignmentDate',
      slots: 'id, parentClassId, position',
      templates: 'id, type, isEnabled, isAnchor',
      quests: 'id, templateId, type, parentClassId, completionDate',
      weeklyBundles: 'id, isoYear, isoWeek, isCompleted'
    });
  }
}
export const db = new LevelUpDB();
```

---

## 🔄 Core Game Logic

### 1. Daily Reset & Assignment

* Resets all quests completed before today.
* Replaces expired quests with new ones from enabled templates.
* Assigns quests to unlocked slots based on class level.

### 2. Weekly Bundle

* Generated automatically on Monday or when the ISO week changes.
* If a **weekly anchor** exists → 1 anchor + 2–3 random daily templates.
* If not → 4–5 daily templates.
* Grants **XP to all classes** and **Gold to user** with a 2× bonus.

### 3. Reroll System

* Manual reroll replaces uncompleted daily quests.
* Cost = `(slotsUnlocked * 10) * (1 + 0.1 * level) * (1 + 0.5 * rerollsThisWeek)`
* Resets weekly when the new weekly bundle is created.

### 4. Scaling

```ts
scaledRequirement(level, l1?, l100?) {
  if (!l1 && !l100) return 1;
  if (l1 === l100 || !l1 || !l100) return l1 ?? l100;
  const t = Math.max(1, Math.min(100, level));
  return Math.round(l1 + (l100 - l1) * ((t - 1) / 99));
}
```

* Fixed quests: `level1Requirement === level100Requirement`

---

## 🧩 Maintenance Strategy

Since background tasks aren’t possible, maintenance runs only:

* When the app is opened
* When returning to the foreground (`visibilitychange`)
* Every 60 seconds while the app is open

It checks:

* If a new day started → triggers daily reset & reassignment.
* If ISO week changed → resets reroll count & creates a new weekly bundle.

---

## 🎮 Quest Card Controls

Unified controls for **Class cards** and the **Weekly card**.

### Primary interactions

* **Center button (two-step action):**

  1. **First tap** → instantly set progress to **100%** (i.e., `progress = requirement`).
  2. **Second tap** → completes the quest (or collects the weekly reward if applicable).

  * The button label updates dynamically:

    * When progress < 100% → **“Complete Quest”** (first tap will fill to 100%).
    * When progress = 100% → **“Collect Reward”** (tapping completes and grants XP/Gold).

* **Left / Right buttons (– / +):**

  * Tap to **decrease** or **increase** progress by 1 step.
  * **Press-and-hold acceleration:** while held, the updates speed up over time (e.g., start at 6 steps/sec, ramp to ~30 steps/sec within ~800ms). Release to stop.
  * Clamp to `[0, requirement]`.

* **Progress number (X / Y):**

  * Tapping `X / Y` opens a **numpad** to enter a specific value for `X` (the current progress).
  * On confirm, clamp to `[0, requirement]` and update the bar instantly.

### Implementation notes (UI/UX)

* Disable the **Collect Reward** state while a write is in flight to avoid double-claims.
* Provide subtle haptic/vibration (if available) on state transitions: fill-to-100 and collect.
* Animate progress bar changes with a short (150–200ms) ease-out.
* Respect scaling: the **requirement (Y)** should already be computed using the class level (or template for weekly).
* Accessibility: buttons are reachable via keyboard; `aria-label`s for “decrement”, “increment”, and “collect reward”.

---

## 🧭 UI Layout

### Home Tab

* Top: Total Gold counter.
* **Weekly bundle card** (with bonus multiplier and progress).
* **Class cards** (like iOS screenshot):

  * Emoji + name + subtitle
  * XP bar + Level label
  * Quests with progress and Collect/Complete buttons
  * Locked slot rows with Level requirement.

### Quests Tab

* Lists **quest templates** (Daily + Weekly Anchors)
* Toggle `isEnabled`
* Edit/Delete template entries.

### Settings Tab

* Placeholder for:

  * Theme selection
  * Export / Import JSON backup
  * Force daily / weekly reset (debug)

---

## 💡 Visual Style

* Rounded-2xl containers
* Soft shadow (`shadow-sm`, hover `shadow-md`)
* Subtle color accents (`amber-500` for gold, `rose-500` for XP)
* Progress bars with `bg-slate-200` tracks and colored fills
* iOS-like typography: clean, balanced padding, whitespace emphasis
* Each class uses its soft pastel accent color as background or border tint

---

## ⚙️ PWA Configuration

* **vite-plugin-pwa** setup:

  ```js
  // vite.config.ts
  import { VitePWA } from 'vite-plugin-pwa';

  export default defineConfig({
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          name: 'LevelUp',
          short_name: 'LevelUp',
          start_url: '/',
          display: 'standalone',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ]
  });
  ```

---

## 🧩 Folder Structure

```
/src
  main.tsx
  App.tsx
  /db
    db.ts
  /logic
    scaling.ts
    assign.ts
    reroll.ts
    weekly.ts
    maintenance.ts
  /ui
    /home
      Home.tsx
      ClassCard.tsx
    /quests
      QuestsTab.tsx
    /settings
      SettingsTab.tsx
  /styles
    index.css
```

---

## 🧪 Definition of Done

* PWA installs and launches offline after first load (manifest + service worker verified).
* Dexie schema created; entities persist and load across reloads.
* Maintenance runs on app open/foreground + 60s interval; daily and weekly rules applied.
* **Home** shows: Weekly card + Class cards with correct colors and states.
* **Quest Card Controls** work the same on Class and Weekly cards:

  * Center button: first tap fills to 100%, second tap **Collect Reward** (with in-flight guard).
  * +/- buttons: tap to step; **press-and-hold** accelerates changes; clamped to [0, requirement].
  * Tapping `X / Y` opens numpad and sets progress.
* Reroll cost formula implemented; weekly reset clears reroll count.
* Slot unlock rules enforced with level & gold costs.
* Templates tab: create/edit/delete + **Enabled** toggle respected by all pickers.
* Export/Import JSON functions present and tested with a small roundtrip.
* Basic accessibility: aria-labels on controls; focus styles; keyboard operable.
* Light e2e sanity: offline reload; template toggle affects assignment; weekly bundle regeneration on week change.

---

## 🧰 Copilot Setup Prompt

To bootstrap the project, use this Copilot instruction:

> **Prompt:**
> Create a minimal React + TypeScript PWA using Vite. Install TailwindCSS, Dexie, and vite-plugin-pwa. Configure it for offline support and installability. Create three tabs (Home, Quests, Settings) with bottom navigation. Implement a mock ClassCard component styled like an iOS card (XP bar, quests, locked slots). Set up Dexie with example tables for users, classes, quests, templates, and weekly bundles. Include a maintenance hook that logs a tick every minute. Ensure `npm run dev` launches a working PWA scaffold.

---

**End of Guidebook**
