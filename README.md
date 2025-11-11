# LevelUp PWA

## Overview

LevelUp is a personal habit-building Progressive Web App (PWA) inspired by RPG mechanics. It helps users complete daily and weekly "quests" to earn XP and gold, level up classes, and maintain habits.

## Project Structure

```
LevelUp
├── Guidebook
│   └── Guidebook.md
├── src
│   ├── main.tsx
│   ├── App.tsx
│   ├── db
│   │   └── db.ts
│   ├── logic
│   │   └── maintenance.ts
│   ├── styles
│   │   └── index.css
│   └── ui
│       ├── home
│       │   └── Home.tsx
│       ├── quests
│       │   └── QuestsTab.tsx
│       └── settings
│           └── SettingsTab.tsx
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

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build, run:
```
npm run build
```

## Features

- Fully offline operation after first load
- Persistent local data using Dexie and IndexedDB
- Smooth iOS-style UI with Tailwind CSS and Framer Motion
- Installable PWA via browser

## License

This project is licensed under the MIT License. See the LICENSE file for details.