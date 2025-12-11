import { db } from "./db";
import questTemplatesData from "../data/questTemplates.json";
import userDefaultsData from "../data/userDefaults.json";
import classConfigData from "../data/classConfig.json";

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
          classOrder: ["Warrior", "Ranger", "Mage", "Bard", "Chef", "Sheep"], // Default order
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
          if (category === "Weekly" || category === "Bard") continue; // Skip empty categories

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
