import {
  db,
  type CharacterClass,
  type QuestTemplate,
  type QuestInstance,
} from "../db/db";

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function interpolateNumber(level: number, min: number, max: number): number {
  const clamped = Math.max(1, Math.min(100, level));
  const t = (clamped - 1) / 99; // 0..1
  return Math.round(min + (max - min) * t);
}

function parseRequirementPair(
  level1?: number,
  level100?: number
): { min: number; max: number } | null {
  if (level1 === undefined || level100 === undefined) return null;
  if (isNaN(level1) || isNaN(level100)) return null;
  return { min: level1, max: level100 };
}

export function computeRequirementCount(
  template: QuestTemplate,
  classLevel: number
): number {
  if (template.scaling) {
    const pair = parseRequirementPair(
      template.level1RequirementCount,
      template.level100RequirementCount
    );
    if (pair) {
      return interpolateNumber(classLevel, pair.min, pair.max);
    }
  }
  return template.requirementCount ?? 1;
}

function rewardFromTemplate(
  template: QuestTemplate,
  classLevel: number
): { xp: number; gold: number } {
  // Scale rewards: level 1 = 1x, level 100 = 10x
  const clamped = Math.max(1, Math.min(100, classLevel));
  const scale = 1 + (clamped - 1) / 11; // 1x at level 1, 10x at level 100
  return {
    xp: Math.round(template.baseXP * scale),
    gold: Math.round(template.baseGold * scale),
  };
}

export async function generateDailyQuests(): Promise<void> {
  const classes = await db.classes.toArray();
  const unlocked = classes.filter((c) => c.isUnlocked);
  const templates = await db.questTemplates
    .where("type")
    .equals("Daily")
    .toArray();

  for (const cls of unlocked) {
    const enabledForClass = templates.filter(
      (t) => t.class === cls.id && t.enabled
    );
    const slots = cls.dailyQuestSlots;
    // Shuffle and pick random N quests instead of always first N
    const shuffled = shuffleArray(enabledForClass);
    const selected = shuffled.slice(0, slots);

    // Clear previous active daily quests for this class
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    );
    const prev = await db.questInstances
      .where({ type: "Daily", class: cls.id })
      .toArray();
    for (const inst of prev) {
      await db.questInstances.update(inst.id!, { status: "failed" });
    }

    for (let i = 0; i < selected.length; i++) {
      const t = selected[i];
      const requirementCount = computeRequirementCount(t, cls.level);
      const reward = rewardFromTemplate(t, cls.level);
      const instance: QuestInstance = {
        templateId: t.id!,
        type: "Daily",
        templateType: t.type,
        class: cls.id,
        title: t.title,
        description: t.description,
        requirementCount,
        progress: 0,
        progressGoal: requirementCount,
        xpReward: reward.xp,
        goldReward: reward.gold,
        status: "active",
        createdAt: now,
        expiresAt: midnight,
        classLevel: cls.level,
        rerollCount: 0,
        slotIndex: i,
      };
      await db.questInstances.add(instance);
    }
  }
}

export async function generateDailyQuestsForClass(
  classId: string
): Promise<void> {
  const cls = await db.classes.get(classId);
  if (!cls || !cls.isUnlocked) return;
  const templates = await db.questTemplates
    .where("type")
    .equals("Daily")
    .toArray();
  const enabledForClass = templates.filter(
    (t) => t.class === cls.id && t.enabled
  );
  const slots = cls.dailyQuestSlots;
  const shuffled = shuffleArray(enabledForClass);
  const selected = shuffled.slice(0, slots);

  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );
  const prev = await db.questInstances
    .where({ type: "Daily", class: cls.id })
    .toArray();
  for (const inst of prev) {
    await db.questInstances.update(inst.id!, { status: "failed" });
  }

  for (let i = 0; i < selected.length; i++) {
    const t = selected[i];
    const requirementCount = computeRequirementCount(t, cls.level);
    const reward = rewardFromTemplate(t, cls.level);
    await db.questInstances.add({
      templateId: t.id!,
      type: "Daily",
      templateType: t.type,
      class: cls.id,
      title: t.title,
      description: t.description,
      requirementCount,
      progress: 0,
      progressGoal: requirementCount,
      xpReward: reward.xp,
      goldReward: reward.gold,
      status: "active",
      createdAt: now,
      expiresAt: midnight,
      classLevel: cls.level,
      rerollCount: 0,
      slotIndex: i,
    });
  }
}

export async function generateWeeklyQuests(): Promise<void> {
  const classes = await db.classes.toArray();
  // Gate weekly quests behind progress: at least 3 classes at level >= 3
  const eligibleCount = classes.filter(
    (c) => c.isUnlocked && c.level >= 3
  ).length;
  if (eligibleCount < 3) {
    return;
  }
  const unlocked = classes.filter((c) => c.isUnlocked);
  if (unlocked.length === 0) return;
  const avgLevel = Math.round(
    unlocked.reduce((a, c) => a + c.level, 0) / unlocked.length
  );

  // Pick from ALL enabled Daily templates (not class-specific)
  const templates = await db.questTemplates.toArray();
  const dailies = templates.filter((t) => t.type === "Daily" && t.enabled);
  const weeklies = templates.filter((t) => t.type === "Weekly" && t.enabled);

  // Determine pick counts: if weekly quests exist, pick 1 weekly + 4 dailies, otherwise pick 5 dailies
  const weeklyCount = weeklies.length > 0 ? 1 : 0;
  const dailyCount = weeklyCount > 0 ? 4 : 5;

  // Shuffle and pick random weeklies (max 1)
  const shuffledWeeklies = shuffleArray(weeklies);
  const pickedWeeklies = shuffledWeeklies.slice(0, weeklyCount);

  // Shuffle and pick random dailies
  const shuffledDailies = shuffleArray(dailies);
  const pickedDailies = shuffledDailies.slice(
    0,
    Math.min(dailyCount, dailies.length)
  );

  // Combine both
  const picked = [...pickedWeeklies, ...pickedDailies];

  // Clear previous weekly
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  sunday.setHours(0, 0, 0, 0);
  const prevWeekly = await db.questInstances
    .where({ type: "Weekly" })
    .toArray();
  for (const inst of prevWeekly) {
    await db.questInstances.update(inst.id!, { status: "failed" });
  }

  for (let i = 0; i < picked.length; i++) {
    const t = picked[i];
    const requirementCount = computeRequirementCount(t, avgLevel);
    const reward = rewardFromTemplate(t, avgLevel);
    const instance: QuestInstance = {
      templateId: t.id!,
      type: "Weekly",
      templateType: t.type,
      class: t.class, // Keep for display purposes only
      title: t.title,
      description: t.description,
      requirementCount,
      progress: 0,
      progressGoal: requirementCount,
      xpReward: reward.xp,
      goldReward: reward.gold,
      status: "active",
      createdAt: now,
      expiresAt: sunday,
      classLevel: avgLevel,
      rerollCount: 0,
      slotIndex: i,
    };
    await db.questInstances.add(instance);
  }

  // Update user's lastWeeklyGenerated timestamp
  const user = await db.user.get("player");
  if (user) {
    await db.user.update("player", { lastWeeklyGenerated: new Date() });
  }
}

/** Returns true if weekly quests are unlocked by player progress */
export async function isWeeklyUnlocked(): Promise<boolean> {
  const classes = await db.classes.toArray();
  const eligibleCount = classes.filter(
    (c) => c.isUnlocked && c.level >= 3
  ).length;
  return eligibleCount >= 3;
}
