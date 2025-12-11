import { db } from "../db/db";
import { calculateXPToNextLevel } from "../db/seed";
import {
  computeRequirementCount,
  generateDailyQuestsForClass,
  isWeeklyUnlocked,
  generateWeeklyQuests,
} from "./questGeneration";

export interface QuestCompletionResult {
  goldAwarded: number;
  xpAwarded: number;
  leveledUp: boolean;
  newLevel?: number;
  className: string;
}

const REROLL_COSTS = [10, 25, 50, 100, 200, 400];
const CLASS_UNLOCK_COST = 200;
const SLOT_COSTS = { slot3: 50, slot4: 100, slot5: 150 };
const SLOT_LEVEL_REQUIREMENTS = { slot3: 5, slot4: 10, slot5: 15 };
const WEEKLY_MULTIPLIER = 3;

export function getRerollCost(dailyRerollCount: number): number {
  if (dailyRerollCount < REROLL_COSTS.length) {
    return REROLL_COSTS[dailyRerollCount];
  }
  // After 6 rerolls, exponential: 400 * 2^(n-5)
  return 400 * Math.pow(2, dailyRerollCount - 5);
}

/**
 * Update quest progress to a specific value
 */
export async function updateQuestProgress(
  instanceId: number,
  newProgress: number
): Promise<void> {
  const instance = await db.questInstances.get(instanceId);
  if (!instance) {
    throw new Error("Quest instance not found");
  }

  if (instance.status !== "active") {
    throw new Error("Can only update progress on active quests");
  }

  // Clamp progress between 0 and progressGoal
  const clampedProgress = Math.max(
    0,
    Math.min(newProgress, instance.progressGoal)
  );

  await db.questInstances.update(instanceId, {
    progress: clampedProgress,
  });
}

/**
 * Increment quest progress by a specific amount
 */
export async function incrementQuestProgress(
  instanceId: number,
  amount: number = 1
): Promise<void> {
  const instance = await db.questInstances.get(instanceId);
  if (!instance) {
    throw new Error("Quest instance not found");
  }

  const newProgress = Math.min(
    instance.progress + amount,
    instance.progressGoal
  );
  await updateQuestProgress(instanceId, newProgress);
}

/**
 * Decrement quest progress by a specific amount
 */
export async function decrementQuestProgress(
  instanceId: number,
  amount: number = 1
): Promise<void> {
  const instance = await db.questInstances.get(instanceId);
  if (!instance) {
    throw new Error("Quest instance not found");
  }

  const newProgress = Math.max(instance.progress - amount, 0);
  await updateQuestProgress(instanceId, newProgress);
}

/**
 * Reroll a quest instance to a new random quest from the same class
 * Costs gold based on daily reroll count
 */
export async function rerollQuest(
  instanceId: number
): Promise<{ cost: number; newQuestTitle: string }> {
  const instance = await db.questInstances.get(instanceId);
  if (!instance) {
    throw new Error("Quest instance not found");
  }

  if (instance.status !== "active") {
    throw new Error("Can only reroll active quests");
  }

  const user = await db.user.get("player");
  if (!user) {
    throw new Error("User not found");
  }

  const cost = getRerollCost(user.dailyRerollCount);

  if (user.gold < cost) {
    throw new Error(`Insufficient gold. Need ${cost}, have ${user.gold}`);
  }

  // Get available templates for this class
  const templates = await db.questTemplates
    .where({ type: instance.type, class: instance.class })
    .and((t) => t.enabled)
    .toArray();

  // Get all non-failed quest instances for this class today to exclude their templates
  const todayQuests = await db.questInstances
    .where({ type: instance.type, class: instance.class })
    .toArray();

  // Get template IDs that are already assigned/completed today (exclude current one being rerolled)
  const usedTemplateIds = new Set(
    todayQuests
      .filter((q) => q.id !== instanceId && q.status !== "failed")
      .map((q) => q.templateId)
  );

  // Exclude current template and any already-used templates from today
  const available = templates.filter(
    (t) => t.id !== instance.templateId && !usedTemplateIds.has(t.id!)
  );

  if (available.length === 0) {
    throw new Error("No alternative quests available to reroll to");
  }

  // Pick random template
  const newTemplate = available[Math.floor(Math.random() * available.length)];

  // Get class level for scaling
  const charClass = await db.classes.get(instance.class);
  const classLevel = charClass?.level ?? 1;

  // Calculate new requirement and rewards
  const requirementCount = computeRequirementCount(newTemplate, classLevel);
  const scale = 1 + (Math.max(1, Math.min(100, classLevel)) - 1) / 200;
  const xpReward = Math.round(newTemplate.baseXP * scale);
  const goldReward = Math.round(newTemplate.baseGold * scale);

  // Deduct gold and increment reroll count
  await db.user.update("player", {
    gold: user.gold - cost,
    dailyRerollCount: user.dailyRerollCount + 1,
  });

  // Update instance with new quest
  await db.questInstances.update(instanceId, {
    templateId: newTemplate.id!,
    title: newTemplate.title,
    description: newTemplate.description,
    requirementCount,
    progress: 0,
    progressGoal: requirementCount,
    xpReward,
    goldReward,
    rerollCount: instance.rerollCount + 1,
  });

  return {
    cost,
    newQuestTitle: newTemplate.title,
  };
}

/**
 * Complete a quest instance
 * Awards gold and XP for Daily quests only; Weekly quests give no individual rewards
 */
export async function completeQuest(
  instanceId: number
): Promise<QuestCompletionResult> {
  const instance = await db.questInstances.get(instanceId);
  if (!instance) {
    throw new Error("Quest instance not found");
  }

  if (instance.status !== "active") {
    throw new Error("Quest is not active");
  }

  if (instance.progress < instance.progressGoal) {
    throw new Error("Quest progress not completed");
  }

  // Mark instance as completed
  await db.questInstances.update(instanceId, {
    status: "completed",
    completedAt: new Date(),
  });

  // Weekly quests don't award individual rewards; only daily quests do
  if (instance.type === "Daily") {
    const user = await db.user.get("player");
    if (user) {
      await db.user.update("player", {
        gold: user.gold + instance.goldReward,
        totalXP: user.totalXP + instance.xpReward,
      });
    }
  }

  // Award XP to class and check for level-up (Daily quests only)
  if (instance.type === "Weekly") {
    return {
      goldAwarded: 0,
      xpAwarded: 0,
      leveledUp: false,
      className: instance.class,
    };
  }

  const charClass = await db.classes.get(instance.class);
  if (!charClass) {
    return {
      goldAwarded: instance.goldReward,
      xpAwarded: instance.xpReward,
      leveledUp: false,
      className: instance.class,
    };
  }

  let newXP = charClass.currentXP + instance.xpReward;
  let level = charClass.level;
  let leveledUp = false;

  // Check for level-ups (can level multiple times if XP is high enough)
  while (newXP >= charClass.xpToNextLevel && level < 100) {
    newXP -= charClass.xpToNextLevel;
    level++;
    leveledUp = true;
  }

  // Cap at level 100
  if (level >= 100) {
    level = 100;
    newXP = 0;
  }

  const xpToNext = level < 100 ? calculateXPToNextLevel(level) : 0;

  await db.classes.update(instance.class, {
    level,
    currentXP: newXP,
    xpToNextLevel: xpToNext,
  });

  // If player crosses the weekly unlock threshold, ensure a weekly bundle exists
  try {
    if (await isWeeklyUnlocked()) {
      const activeWeekly = await db.questInstances
        .where({ type: "Weekly", status: "active" })
        .toArray();
      if (activeWeekly.length === 0) {
        await generateWeeklyQuests();
      }
    }
  } catch {}

  return {
    goldAwarded: instance.goldReward,
    xpAwarded: instance.xpReward,
    leveledUp,
    newLevel: leveledUp ? level : undefined,
    className: instance.class,
  };
}

/**
 * Collect weekly bundle reward if all weekly quests are completed.
 * Reward: sum of weekly quests (gold/xp) times WEEKLY_MULTIPLIER.
 * Gold goes to user; XP is awarded to ALL unlocked classes.
 */
export async function collectWeeklyReward(): Promise<{
  goldAwarded: number;
  xpAwardedPerClass: number;
  totalXPDistributed: number;
}> {
  const weekly = await db.questInstances.where({ type: "Weekly" }).toArray();
  // Only consider active/completed quests from current week (ignore failed/old quests)
  const currentWeekly = weekly.filter((w) => w.status !== "failed");

  if (currentWeekly.length === 0) {
    throw new Error("No weekly quests available");
  }
  const allCompleted = currentWeekly.every((w) => w.status === "completed");
  if (!allCompleted) {
    throw new Error("Complete all weekly quests to collect reward");
  }

  const baseGold = currentWeekly.reduce((sum, w) => sum + w.goldReward, 0);
  const baseXP = currentWeekly.reduce((sum, w) => sum + w.xpReward, 0);
  const totalGold = baseGold * WEEKLY_MULTIPLIER;
  const totalXP = baseXP * WEEKLY_MULTIPLIER;

  // Award gold to user
  const user = await db.user.get("player");
  if (!user) throw new Error("User not found");
  await db.user.update("player", { gold: user.gold + totalGold });

  // Distribute XP evenly to all unlocked classes
  const classes = (await db.classes.toArray()).filter((c) => c.isUnlocked);
  if (classes.length === 0) {
    return {
      goldAwarded: totalGold,
      xpAwardedPerClass: 0,
      totalXPDistributed: 0,
    };
  }
  const xpPerClass = Math.floor(totalXP / classes.length);

  for (const cls of classes) {
    let newXP = cls.currentXP + xpPerClass;
    let level = cls.level;
    let xpToNext = cls.xpToNextLevel;
    while (level < 100 && newXP >= xpToNext) {
      newXP -= xpToNext;
      level++;
      xpToNext = level < 100 ? calculateXPToNextLevel(level) : 0;
    }
    if (level >= 100) {
      level = 100;
      newXP = 0;
      xpToNext = 0;
    }
    await db.classes.update(cls.id, {
      level,
      currentXP: newXP,
      xpToNextLevel: xpToNext,
    });
  }

  // Mark weekly quests as rewarded (optional: set status to failed to prevent re-collection)
  for (const w of currentWeekly) {
    await db.questInstances.update(w.id!, { status: "failed" });
  }

  return {
    goldAwarded: totalGold,
    xpAwardedPerClass: xpPerClass,
    totalXPDistributed: xpPerClass * classes.length,
  };
}

/**
 * Unlock a character class for 200 gold
 */
export async function unlockClass(className: string): Promise<void> {
  const user = await db.user.get("player");
  if (!user) {
    throw new Error("User not found");
  }

  if (user.gold < CLASS_UNLOCK_COST) {
    throw new Error(
      `Insufficient gold. Need ${CLASS_UNLOCK_COST}, have ${user.gold}`
    );
  }

  const charClass = await db.classes.get(className);
  if (!charClass) {
    throw new Error(`Class '${className}' not found`);
  }

  if (charClass.isUnlocked) {
    throw new Error(`Class '${className}' is already unlocked`);
  }

  // Deduct gold and unlock class
  await db.user.update("player", {
    gold: user.gold - CLASS_UNLOCK_COST,
  });

  await db.classes.update(className, {
    isUnlocked: true,
  });

  // Immediately generate daily quests for this class so the user can play
  await generateDailyQuestsForClass(className);
}

/**
 * Unlock a quest slot for a class (slot3/slot4/slot5)
 */
export async function unlockQuestSlot(
  className: string,
  slot: "slot3" | "slot4" | "slot5"
): Promise<void> {
  const user = await db.user.get("player");
  if (!user) {
    throw new Error("User not found");
  }

  const cost = SLOT_COSTS[slot];
  if (user.gold < cost) {
    throw new Error(`Insufficient gold. Need ${cost}, have ${user.gold}`);
  }

  const charClass = await db.classes.get(className);
  if (!charClass) {
    throw new Error(`Class '${className}' not found`);
  }

  if (!charClass.isUnlocked) {
    throw new Error(`Must unlock class '${className}' first`);
  }

  const requiredLevel = SLOT_LEVEL_REQUIREMENTS[slot];
  if (charClass.level < requiredLevel) {
    throw new Error(`Class must be level ${requiredLevel} to unlock this slot`);
  }

  const slotKey = `${slot}Unlocked` as
    | "slot3Unlocked"
    | "slot4Unlocked"
    | "slot5Unlocked";
  if (charClass[slotKey]) {
    throw new Error(`${slot} is already unlocked for ${className}`);
  }

  // Deduct gold and unlock slot
  await db.user.update("player", {
    gold: user.gold - cost,
  });

  const currentSlots = charClass.dailyQuestSlots;
  await db.classes.update(className, {
    [slotKey]: true,
    dailyQuestSlots: currentSlots + 1,
  });
}
