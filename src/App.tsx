import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Home from "./ui/home/Home";
import QuestsTab from "./ui/quests/QuestsTab";
import SettingsTab from "./ui/settings/SettingsTab";

const tabs = ["Home", "Quests", "Settings"] as const;
export type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  return (
    <div className="mx-auto flex h-full max-w-screen-sm flex-col">
      <div className="flex-1 p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "Home" && <Home />}
            {tab === "Quests" && <QuestsTab />}
            {tab === "Settings" && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <nav className="sticky bottom-0 grid grid-cols-3 border-t bg-white/90 p-2 backdrop-blur dark:bg-slate-900/90">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-sm font-medium ${
              tab === t ? "bg-slate-100 dark:bg-slate-800" : ""
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
