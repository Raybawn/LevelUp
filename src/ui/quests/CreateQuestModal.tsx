import React, { useState } from "react";
import { userData } from "../../db/userData";
import type { Quest } from "../../db/db";

interface CreateQuestModalProps {
    onClose: () => void;
    onSave: (quest: Quest) => void;
    quest?: Quest; // Optional prop for editing quests
}

const CreateQuestModal: React.FC<CreateQuestModalProps> = ({ onClose, onSave, quest }) => {
    const [title, setTitle] = useState(quest?.title || "");
    const [description, setDescription] = useState(quest?.description || "");
    const [type, setType] = useState<Quest["type"]>(quest?.type || "Daily");
    const [enabled, setEnabled] = useState(quest?.enabled ?? true);
    const [classType, setClassType] = useState(quest?.class || "");
    const [baseXP, setBaseXP] = useState(quest?.baseXP || 0);
    const [baseGold, setBaseGold] = useState(quest?.baseGold || 0);
    const [scaling, setScaling] = useState(quest?.scaling || false);
    const [level1Requirements, setLevel1Requirements] = useState(quest?.level1Requirements || "");
    const [level100Requirements, setLevel100Requirements] = useState(quest?.level100Requirements || "");
    const [requirement, setRequirement] = useState(quest?.requirement || "");

    const handleSave = () => {
        const newQuest: Quest = {
            id: quest?.id ?? Date.now(), // Ensure id is always a number
            title,
            description,
            type,
            enabled,
            class: classType,
            baseXP,
            baseGold,
            scaling,
            level1Requirements: scaling ? level1Requirements : undefined,
            level100Requirements: scaling ? level100Requirements : undefined,
            requirement: !scaling ? requirement : undefined,
        };
        onSave(newQuest);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center">
            <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-lg font-semibold mb-4">{quest ? "Edit Quest" : "Create Quest"}</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                    />
                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                    />
                    <div>
                        <label className="text-gray-300">Type:</label>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={type === "Weekly"}
                                onChange={(e) => setType(e.target.checked ? "Weekly" : "Daily")}
                                className="toggle-checkbox"
                            />
                            <span className="text-gray-300 ml-2">Weekly</span>
                        </div>
                    </div>
                    {type === "Daily" && (
                        <div>
                            <label className="text-gray-300">Class:</label>
                            <select
                                value={classType}
                                onChange={(e) => setClassType(e.target.value)}
                                className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                            >
                                {userData.unlockedClasses.map((className) => (
                                    <option key={className} value={className}>
                                        {className}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-gray-300">Base XP:</label>
                        <input
                            type="number"
                            value={baseXP}
                            onChange={(e) => setBaseXP(Number(e.target.value))}
                            className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                        />
                    </div>
                    <div>
                        <label className="text-gray-300">Base Gold:</label>
                        <input
                            type="number"
                            value={baseGold}
                            onChange={(e) => setBaseGold(Number(e.target.value))}
                            className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                        />
                    </div>
                    <div>
                        <label className="text-gray-300">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="mr-2"
                            />
                            Enabled
                        </label>
                    </div>
                    <div>
                        <label className="text-gray-300">
                            <input
                                type="checkbox"
                                checked={scaling}
                                onChange={(e) => setScaling(e.target.checked)}
                                className="mr-2"
                            />
                            Scaling
                        </label>
                    </div>
                    {scaling ? (
                        <>
                            <div>
                                <label className="text-gray-300">Level 1 Requirements:</label>
                                <input
                                    type="text"
                                    value={level1Requirements}
                                    onChange={(e) => setLevel1Requirements(e.target.value)}
                                    className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                                />
                            </div>
                            <div>
                                <label className="text-gray-300">Level 100 Requirements:</label>
                                <input
                                    type="text"
                                    value={level100Requirements}
                                    onChange={(e) => setLevel100Requirements(e.target.value)}
                                    className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="text-gray-300">Requirement:</label>
                            <input
                                type="text"
                                value={requirement}
                                onChange={(e) => setRequirement(e.target.value)}
                                className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2"
                            />
                        </div>
                    )}
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-500 text-white rounded">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateQuestModal;