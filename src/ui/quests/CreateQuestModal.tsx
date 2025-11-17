import React, { useState } from "react";
import "../../styles/ui-minimal.css";
import { userData } from "../../db/userData";
import type { Quest } from "../../db/db";

interface CreateQuestModalProps {
  onClose: () => void;
  onSave: (quest: Quest) => void;
  quest?: Quest; // Optional prop for editing quests
}

const CreateQuestModal: React.FC<CreateQuestModalProps> = ({
  onClose,
  onSave,
  quest,
}) => {
  const [title, setTitle] = useState(quest?.title || "");
  const [description, setDescription] = useState(quest?.description || "");
  const [type, setType] = useState<Quest["type"]>(quest?.type || "Daily");
  const [enabled, setEnabled] = useState(quest?.enabled ?? true);
  const [classType, setClassType] = useState(quest?.class || "");
  const [baseXP, setBaseXP] = useState(quest?.baseXP || 0);
  const [baseGold, setBaseGold] = useState(quest?.baseGold || 0);
  const [scaling, setScaling] = useState(quest?.scaling || false);
  const [level1Requirements, setLevel1Requirements] = useState(
    quest?.level1Requirements || ""
  );
  const [level100Requirements, setLevel100Requirements] = useState(
    quest?.level100Requirements || ""
  );
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
    <div className="modal-overlay">
      <div className="modal-panel">
        <h2 className="modal-title">{quest ? "Edit Quest" : "Create Quest"}</h2>
        <div className="form-rows">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
          />
          <div className="form-row">
            <label className="form-label">Type:</label>
            <div className="toggle-row">
              <input
                type="checkbox"
                checked={type === "Weekly"}
                onChange={(e) => setType(e.target.checked ? "Weekly" : "Daily")}
                className="toggle-checkbox"
              />
              <span className="muted">Weekly</span>
            </div>
          </div>
          {type === "Daily" && (
            <div className="form-row">
              <label className="form-label">Class:</label>
              <select
                value={classType}
                onChange={(e) => setClassType(e.target.value)}
                className="form-input"
              >
                {userData.unlockedClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-row">
            <label className="form-label">Base XP:</label>
            <input
              type="number"
              value={baseXP}
              onChange={(e) => setBaseXP(Number(e.target.value))}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <label className="form-label">Base Gold:</label>
            <input
              type="number"
              value={baseGold}
              onChange={(e) => setBaseGold(Number(e.target.value))}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <label className="form-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="toggle-checkbox"
              />
              Enabled
            </label>
          </div>
          <div className="form-row">
            <label className="form-label">
              <input
                type="checkbox"
                checked={scaling}
                onChange={(e) => setScaling(e.target.checked)}
                className="toggle-checkbox"
              />
              Scaling
            </label>
          </div>
          {scaling ? (
            <>
              <div className="form-row">
                <label className="form-label">Level 1 Requirements:</label>
                <input
                  type="text"
                  value={level1Requirements}
                  onChange={(e) => setLevel1Requirements(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Level 100 Requirements:</label>
                <input
                  type="text"
                  value={level100Requirements}
                  onChange={(e) => setLevel100Requirements(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          ) : (
            <div className="form-row">
              <label className="form-label">Requirement:</label>
              <input
                type="text"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className="form-input"
              />
            </div>
          )}
        </div>
        <div className="actions">
          <button onClick={onClose} className="btn btn-muted">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuestModal;
