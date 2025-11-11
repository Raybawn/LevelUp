import React, { useState } from "react";
import CreateQuestModal from "./CreateQuestModal";
import { db, Quest } from "../../db/db";

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
        <div className="rounded-2xl border bg-gray-800 text-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Quest Templates</h2>
            <p className="text-gray-300">Manage your quest templates here.</p>

            <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
                Create Quest
            </button>

            {groupedQuests.map(([category, questList]) => (
                <div key={category} className="mt-4">
                    <h3 className="text-md font-medium capitalize text-gray-200">{category} Quests</h3>
                    <ul className="list-disc pl-5">
                        {questList.map((quest) => (
                            <li key={quest.id} className="text-gray-300 flex justify-between items-center">
                                <span>{quest.title} ({quest.type})</span>
                                <div>
                                    <button
                                        onClick={() => setEditQuest(quest)}
                                        className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded"
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
                </div>
            ))}

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