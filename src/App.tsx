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
    <div className="app-root">
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
      <nav className="app-nav">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-button ${tab === t ? "active" : ""}`}
            aria-current={tab === t ? "true" : undefined}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
