import React, { useState } from "react";
import CreateQuestModal from "./CreateQuestModal";
import { db, Quest } from "../../db/db";
import { classConfig } from "../../db/classConfig";

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
            class: "General", // Added default class for Weekly quests
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
        const category = newQuest.type === "Weekly" ? "Weekly" : newQuest.class || "Unknown"; // Ensure category is always a string
        setQuests((prevQuests) => ({
            ...prevQuests,
            [category]: [...(prevQuests[category] || []), newQuest],
        }));
    };

    const handleEditQuest = async (updatedQuest: Quest) => {
        const newCategory = updatedQuest.type === "Weekly" ? "Weekly" : updatedQuest.class || "Unknown";
        setQuests((prevQuests) => {
            // Find the old category containing this quest
            const oldCategory = Object.keys(prevQuests).find((cat) =>
                (prevQuests[cat] || []).some((q) => q.id === updatedQuest.id)
            );

            const next: QuestCategory = { ...prevQuests };

            if (oldCategory) {
                next[oldCategory] = (next[oldCategory] || []).filter((q) => q.id !== updatedQuest.id);
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
        const category = quest.type === "Weekly" ? "Weekly" : quest.class || "Unknown";
        setQuests((prevQuests) => {
            const list = prevQuests[category] || [];
            return {
                ...prevQuests,
                [category]: list.filter((q) => q.id !== quest.id),
            };
        });
        await db.quests.delete(quest.id);
    };

    const groupedQuests = Object.entries(quests).filter(([_, questList]) => questList.length > 0); // Filter out empty categories

    return (
        <div className="relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Quest Management</h1>
                    <p className="text-gray-300">Manage your quest templates here.</p>
                </div>

                {/* Floating circular + button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    aria-label="Create Quest"
                    className="ml-4 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg hover:bg-blue-600"
                >
                    <span className="text-2xl leading-none">+</span>
                </button>
            </div>

            <div className="mt-6 space-y-4">
                {groupedQuests.map(([category, questList]) => (
                    <section key={category} className="rounded border bg-transparent p-0">
                        <div className="flex items-center justify-between p-3 border-b bg-gray-800 rounded-t">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ background: (classConfig as any)[category as keyof typeof classConfig]?.color || "#6B7280" }}
                                />
                                <h3 className="text-md font-semibold capitalize text-gray-100">{category}</h3>
                            </div>
                            <span className="text-sm text-gray-300">{questList.length} quests</span>
                        </div>
                        <ul className="mt-0 p-3 space-y-2">
                            {questList.map((quest) => (
                                <li key={quest.id} className="text-gray-300 flex justify-between items-center p-2 rounded">
                                    <div>
                                        <div className="font-medium">{quest.title}</div>
                                        <div className="text-xs text-gray-400 truncate max-w-xs">{quest.description}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditQuest(quest)}
                                            className="px-2 py-1 bg-yellow-500 text-white rounded"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuest(quest)}
                                            className="px-2 py-1 bg-red-500 text-white rounded"
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
                    quest={editQuest} // Pass the quest data to the modal
                />
            )}
        </div>
    );
}