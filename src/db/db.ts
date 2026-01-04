import Dexie, { Table } from "dexie";

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string; // Always "player"
  gold: number;
  totalXP: number;
  dailyRerollCount: number;
  lastRerollReset: Date;
  createdAt: Date;
  lastActive: Date;
  classOrder?: string[]; // Custom order of class names
  lastWeeklyGenerated?: Date; // Track when weekly quests were last generated
}

export interface CharacterClass {
  id: string; // "Warrior", "Mage", etc.
  name: string;
  level: number; // 1-100
  currentXP: number;
  xpToNextLevel: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  dailyQuestSlots: number; // 2-5
  slot3Unlocked: boolean; // Available at level 5
  slot4Unlocked: boolean; // Available at level 10
  slot5Unlocked: boolean; // Available at level 15
}

export interface QuestTemplate {
  id?: number; // Auto-increment
  title: string;
  description: string;
  type: "Daily" | "Weekly";
  class: string;
  baseXP: number;
  baseGold: number;
  enabled: boolean;
  scaling: boolean;
  level1RequirementCount?: number;
  level100RequirementCount?: number;
  requirementCount?: number;
  isCustom: boolean;
  createdAt: Date;
}

export interface QuestInstance {
  id?: number; // Auto-increment
  templateId: number;
  type: "Daily" | "Weekly";
  templateType: "Daily" | "Weekly"; // Track original template type for display
  class: string;
  title: string;
  description: string;
  requirementCount: number;
  progress: number;
  progressGoal: number;
  xpReward: number;
  goldReward: number;
  status: "active" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  classLevel: number;
  rerollCount: number;
  slotIndex: number; // 0-4
}

// ============================================================================
// DATABASE
// ============================================================================

export class LevelUpDB extends Dexie {
  user!: Table<User, string>;
  classes!: Table<CharacterClass, string>;
  questTemplates!: Table<QuestTemplate, number>;
  questInstances!: Table<QuestInstance, number>;

  constructor() {
    super("LevelUpDB");

    this.version(1).stores({
      user: "id",
      classes: "id, isUnlocked, level",
      questTemplates: "++id, type, class, enabled, isCustom",
      questInstances:
        "++id, templateId, type, class, status, expiresAt, slotIndex",
    });
  }
}

export const db = new LevelUpDB();
