# LevelUp PWA

## Overview

LevelUp is a personal habit-building web app inspired by RPG mechanics. It helps users complete daily and weekly "quests" to earn XP and gold, level up classes, and maintain habits.

## Project Structure

```
LevelUp
├── Guidebook
│   └── Guidebook.md
├── src
│   ├── main.ts
│   ├── App.svelte
│   ├── db
│   │   └── db.ts
│   ├── logic
│   │   └── maintenance.ts
│   ├── styles
│   │   ├── index.css
│   │   ├── quests.css
│   │   └── ui-general.css
│   └── ui
│       ├── home
│       │   └── Home.svelte
│       ├── quests
│       │   ├── CreateQuestModal.svelte
│       │   └── QuestsTab.svelte
│       └── settings
│           └── SettingsTab.svelte
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd LevelUp
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Running the Application

To start the development server, run:

```
npm run dev
```

Vite will print the local URL (by default `http://localhost:5173`).

### Building for Production

To create a production build, run:

```
npm run build
```

## Features

- Lightweight Svelte front-end powered by Vite
- Persistent local data using Dexie and IndexedDB
- Mobile-first layout with a fixed bottom navigation bar
- Minimal hand-written CSS for predictable styling

## License

This project is licensed under the MIT License. See the LICENSE file for details.
