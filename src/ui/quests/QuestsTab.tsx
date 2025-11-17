// ...existing code...
import React, { useState } from "react";
import CreateQuestModal from "./CreateQuestModal";
import { db, Quest } from "../../db/db";
import { classConfig } from "../../db/classConfig";
import "../../styles/quests.css";

type QuestCategory = {
  [key: string]: Quest[];
};

const initialQuests: QuestCategory = {
  Warrior: [
    {
      id: 1,
      title: "Defeat 10 enemies",
      description: "Defeat 10 enemies in the forest",
      type: "Daily",
      class: "Warrior",
      baseXP: 100,
      baseGold: 50,
      enabled: true,
      scaling: false,
    },
    {
      id: 2,
      title: "Collect 5 herbs",
      description: "Gather herbs for potion making",
      type: "Daily",
      class: "Warrior",
      baseXP: 80,
      baseGold: 40,
      enabled: true,
      scaling: false,
    },
  ],
  Sheep: [
    {
      id: 3,
      title: "Shear 3 sheep",
      description: "Shear sheep to collect wool",
      type: "Daily",
      class: "Sheep",
      baseXP: 60,
      baseGold: 30,
      enabled: true,
      scaling: false,
    },
  ],
  Weekly: [
    {
      id: 4,
      title: "Win 3 battles",
      description: "Participate in battles and win",
      type: "Weekly",
      class: "General",
      baseXP: 300,
      baseGold: 150,
      enabled: true,
      scaling: false,
    },
  ],
};

export default function QuestsTab() {
  const [quests, setQuests] = useState<QuestCategory>(initialQuests);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editQuest, setEditQuest] = useState<Quest | null>(null);

  const handleSaveQuest = (newQuest: Quest) => {
    const category =
      newQuest.type === "Weekly" ? "Weekly" : newQuest.class || "Unknown";
    setQuests((prevQuests) => ({
      ...prevQuests,
      [category]: [...(prevQuests[category] || []), newQuest],
    }));
  };

  const handleEditQuest = async (updatedQuest: Quest) => {
    const newCategory =
      updatedQuest.type === "Weekly"
        ? "Weekly"
        : updatedQuest.class || "Unknown";
    setQuests((prevQuests) => {
      const oldCategory = Object.keys(prevQuests).find((cat) =>
        (prevQuests[cat] || []).some((q) => q.id === updatedQuest.id)
      );

      const next: QuestCategory = { ...prevQuests };

      if (oldCategory) {
        next[oldCategory] = (next[oldCategory] || []).filter(
          (q) => q.id !== updatedQuest.id
        );
      }

      const destList = (next[newCategory] || []).slice();
      const idx = destList.findIndex((q) => q.id === updatedQuest.id);
      if (idx >= 0) {
        destList[idx] = updatedQuest;
      } else {
        destList.push(updatedQuest);
      }
      next[newCategory] = destList;

      return next;
    });
    await db.quests.put(updatedQuest);
    setEditQuest(null);
  };

  const handleDeleteQuest = async (quest: Quest) => {
    const category =
      quest.type === "Weekly" ? "Weekly" : quest.class || "Unknown";
    setQuests((prevQuests) => {
      const list = prevQuests[category] || [];
      return {
        ...prevQuests,
        [category]: list.filter((q) => q.id !== quest.id),
      };
    });
    await db.quests.delete(quest.id);
  };

  const groupedQuests = Object.entries(quests).filter(
    ([_, questList]) => questList.length > 0
  );

  return (
    <div className="quests-root">
      <div className="quests-header-row">
        <div>
          <h1 className="page-title">Quest Management</h1>
          <p className="page-sub">Manage your quest templates here.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Create Quest"
          className="floating-create btn btn-blue"
        >
          <span className="plus">+</span>
        </button>
      </div>

      <div className="quests-list-wrap">
        {groupedQuests.map(([category, questList]) => (
          <section key={category} className="quest-card">
            <div className="quest-card-header">
              <div
                className="header-strip"
                style={{
                  background:
                    (classConfig as any)[category as keyof typeof classConfig]
                      ?.color || "#E5E7EB",
                }}
              />
              <div className="header-content">
                <h3 className="header-title">{category}</h3>
              </div>
              <span className="header-count">{questList.length} quests</span>
            </div>

            <ul className="quest-items">
              {questList.map((quest) => (
                <li key={quest.id} className="quest-item">
                  <div className="quest-main">
                    <div className="quest-title">{quest.title}</div>
                    <div className="quest-desc">{quest.description}</div>
                  </div>

                  <div className="quest-actions">
                    <button
                      onClick={() => setEditQuest(quest)}
                      className="btn btn-yellow"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuest(quest)}
                      className="btn btn-red"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isModalOpen && (
        <CreateQuestModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveQuest}
        />
      )}

      {editQuest && (
        <CreateQuestModal
          onClose={() => setEditQuest(null)}
          onSave={handleEditQuest}
          quest={editQuest}
        />
      )}
    </div>
  );
}
// ...existing code...
