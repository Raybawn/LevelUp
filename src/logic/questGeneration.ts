import {
  db,
  type CharacterClass,
  type QuestTemplate,
  type QuestInstance,
} from "../db/db";

function interpolateNumber(level: number, min: number, max: number): number {
  const clamped = Math.max(1, Math.min(100, level));
  const t = (clamped - 1) / 99; // 0..1
  return Math.round(min + (max - min) * t);
}

function parseRequirementPair(
  level1?: string,
  level100?: string
): { min: number; max: number; unit?: string } | null {
  if (!level1 || !level100) return null;
  const num1 = parseFloat(level1);
  const num100 = parseFloat(level100);
  const unit =
    level1.replace(String(num1), "").trim() ||
    level100.replace(String(num100), "").trim() ||
    undefined;
  if (isNaN(num1) || isNaN(num100)) return null;
  return { min: num1, max: num100, unit };
}

export function computeRequirement(
  template: QuestTemplate,
  classLevel: number
): string {
  if (template.scaling) {
    const pair = parseRequirementPair(
      template.level1Requirements,
      template.level100Requirements
    );
    if (pair) {
      const value = interpolateNumber(classLevel, pair.min, pair.max);
      return pair.unit ? `${value} ${pair.unit}` : String(value);
    }
  }
  return template.requirement ?? "";
}

function rewardFromTemplate(
  template: QuestTemplate,
  classLevel: number
): { xp: number; gold: number } {
  // Slight scaling: +0..50% based on level
  const scale = 1 + (Math.max(1, Math.min(100, classLevel)) - 1) / 200;
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
    const selected = enabledForClass.slice(0, slots); // naive: first N enabled

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
      const requirement = computeRequirement(t, cls.level);
      const reward = rewardFromTemplate(t, cls.level);
      const instance: QuestInstance = {
        templateId: t.id!,
        type: "Daily",
        class: cls.id,
        title: t.title,
        description: t.description,
        requirement,
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
  const selected = enabledForClass.slice(0, slots);

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
    const requirement = computeRequirement(t, cls.level);
    const reward = rewardFromTemplate(t, cls.level);
    await db.questInstances.add({
      templateId: t.id!,
      type: "Daily",
      class: cls.id,
      title: t.title,
      description: t.description,
      requirement,
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
  // Gate weekly quests behind progress: at least 3 classes at level >= 5
  const eligibleCount = classes.filter(
    (c) => c.isUnlocked && c.level >= 5
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
  const pickCount = Math.min(5, dailies.length);
  // Shuffle and pick random dailies for variety
  const shuffled = dailies.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, pickCount);

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
    const requirement = computeRequirement(t, avgLevel);
    const reward = rewardFromTemplate(t, avgLevel);
    const instance: QuestInstance = {
      templateId: t.id!,
      type: "Weekly",
      class: t.class, // Keep for display purposes only
      title: t.title,
      description: t.description,
      requirement,
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
}

/** Returns true if weekly quests are unlocked by player progress */
export async function isWeeklyUnlocked(): Promise<boolean> {
  const classes = await db.classes.toArray();
  const eligibleCount = classes.filter(
    (c) => c.isUnlocked && c.level >= 5
  ).length;
  return eligibleCount >= 3;
}
