import { db } from "./db";
import questTemplatesData from "../data/questTemplates.json";
import userDefaultsData from "../data/userDefaults.json";
import classConfigData from "../data/classConfig.json";
import {
  generateDailyQuests,
  generateWeeklyQuests,
} from "../logic/questGeneration";

// Prevent multiple concurrent initializations
let initPromise: Promise<void> | null = null;

/**
 * Calculate XP required for next level using linear scaling
 * Lvl 1->2: 100 XP, Lvl 2->3: 200 XP, Lvl 3->4: 300 XP, etc.
 */
export function calculateXPToNextLevel(level: number): number {
  return level * 100;
}

/**
 * Sync quest templates: add new ones from JSON without removing existing
 * This runs on every app load to ensure new templates are added for existing users
 */
export async function syncQuestTemplates(): Promise<void> {
  try {
    type QuestCategory = Record<string, any[]>;
    const templates = questTemplatesData as QuestCategory;

    // Collect all templates from JSON
    const templatesFromJson: any[] = [];
    for (const [category, quests] of Object.entries(templates)) {
      for (const quest of quests) {
        templatesFromJson.push({
          title: quest.title,
          description: quest.description,
          type: quest.type as "Daily" | "Weekly",
          class: quest.class,
          baseXP: quest.baseXP,
          baseGold: quest.baseGold,
          enabled: quest.enabled,
          scaling: quest.scaling,
          level1RequirementCount: quest.level1Requirements
            ? parseInt(quest.level1Requirements)
            : 1,
          level100RequirementCount: quest.level100Requirements
            ? parseInt(quest.level100Requirements)
            : 1,
          requirementCount: quest.requirement ? parseInt(quest.requirement) : 1,
          isCustom: false,
          createdAt: new Date(),
        });
      }
    }

    // Get existing templates to avoid duplicates
    const existingTemplates = await db.questTemplates.toArray();

    // Add new templates that don't already exist
    for (const newTemplate of templatesFromJson) {
      const exists = existingTemplates.some(
        (existing) =>
          existing.title === newTemplate.title &&
          existing.class === newTemplate.class &&
          existing.type === newTemplate.type
      );

      if (!exists) {
        await db.questTemplates.add(newTemplate);
        console.log(`Added new quest template: ${newTemplate.title}`);
      }
    }

    console.log("Quest templates synced!");
  } catch (error) {
    console.error("Failed to sync quest templates:", error);
  }
}

/**
 * Initialize database with default data on first launch
 */
export async function initializeDatabase(): Promise<void> {
  // Check if already initialized
  const existingUser = await db.user.get("player");
  if (existingUser) {
    console.log("Database already initialized");
    return;
  }

  console.log("Initializing database for first time...");

  try {
    await db.transaction(
      "rw",
      [db.user, db.classes, db.questTemplates],
      async () => {
        // 1. Create default user
        await db.user.add({
          id: "player",
          gold: userDefaultsData.gold,
          totalXP: 0,
          dailyRerollCount: 0,
          lastRerollReset: new Date(),
          createdAt: new Date(),
          lastActive: new Date(),
          classOrder: [
            "Warrior",
            "Ranger",
            "Mage",
            "Bard",
            "Chef",
            "Sheep",
            "Weekly",
          ],
        });

        // 2. Initialize all classes
        const starterClasses = ["Warrior", "Ranger", "Mage"];
        const allClassIds = Object.keys(classConfigData).filter(
          (id) => id !== "Weekly"
        );

        for (const classId of allClassIds) {
          const isUnlocked = starterClasses.includes(classId);
          await db.classes.add({
            id: classId,
            name: classId,
            level: 1,
            currentXP: 0,
            xpToNextLevel: calculateXPToNextLevel(1),
            isUnlocked,
            unlockedAt: isUnlocked ? new Date() : undefined,
            dailyQuestSlots: 2, // All start with 2 slots
            slot3Unlocked: false,
            slot4Unlocked: false,
            slot5Unlocked: false,
          });
        }

        // 3. Import quest templates from JSON
        type QuestCategory = Record<string, any[]>;
        const templates = questTemplatesData as QuestCategory;

        for (const [category, quests] of Object.entries(templates)) {
          if (category === "Weekly") continue; // Skip Weekly category (quests will be generated)

          for (const quest of quests) {
            await db.questTemplates.add({
              title: quest.title,
              description: quest.description,
              type: quest.type as "Daily" | "Weekly",
              class: quest.class,
              baseXP: quest.baseXP,
              baseGold: quest.baseGold,
              enabled: quest.enabled,
              scaling: quest.scaling,
              level1RequirementCount: quest.level1Requirements
                ? parseInt(quest.level1Requirements)
                : 1,
              level100RequirementCount: quest.level100Requirements
                ? parseInt(quest.level100Requirements)
                : 1,
              requirementCount: quest.requirement
                ? parseInt(quest.requirement)
                : 1,
              isCustom: false,
              createdAt: new Date(),
            });
          }
        }
      }
    );

    // Generate initial daily and weekly quests (outside transaction)
    await generateDailyQuests();
    await generateWeeklyQuests();

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Transaction failed during initialization:", error);
    throw error;
  }
}

/**
 * Check if database needs initialization and run if needed
 */
export async function ensureInitialized(): Promise<void> {
  // Return existing promise if initialization already in progress
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await initializeDatabase();
      // After initialization, sync templates to pick up any new ones
      await syncQuestTemplates();
    } catch (error) {
      console.error("Failed to initialize database:", error);

      // If initialization fails due to constraint, it might be a partial initialization
      console.log(
        "Tip: If database is corrupted, open DevTools console and run:"
      );
      console.log("  indexedDB.deleteDatabase('LevelUpDB')");
      console.log("Then refresh the page.");
    }
  })();

  return initPromise;
}

/**
 * Clear all data from database (for development/testing)
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    "rw",
    [db.user, db.classes, db.questTemplates, db.questInstances],
    async () => {
      await db.user.clear();
      await db.classes.clear();
      await db.questTemplates.clear();
      await db.questInstances.clear();
    }
  );
  console.log("Database cleared!");
}
