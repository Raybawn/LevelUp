import { db, type CharacterClass } from "../db/db";

/**
 * Get user's preferred class order
 */
async function getUserClassOrder(): Promise<string[]> {
  const user = await db.user.get("player");
  return (
    user?.classOrder ?? [
      "Warrior",
      "Ranger",
      "Mage",
      "Bard",
      "Chef",
      "Sheep",
      "Weekly",
    ]
  );
}

/**
 * Sort classes by user preference
 * If viewMode is "home", locked classes are moved to the bottom
 * Returns both classes and weekly position indicator
 */
export async function getSortedClasses(
  classes: CharacterClass[],
  viewMode: "home" | "quests" = "quests"
): Promise<CharacterClass[]> {
  const userOrder = await getUserClassOrder();

  if (viewMode === "home") {
    // Separate unlocked and locked classes
    const unlocked = classes.filter((c) => c.isUnlocked);
    const locked = classes.filter((c) => !c.isUnlocked);

    // Sort each group by user preference (filtering out "Weekly" first)
    const classesOnly = userOrder.filter((id) => id !== "Weekly");
    const sortedUnlocked = unlocked.sort(
      (a, b) => classesOnly.indexOf(a.id) - classesOnly.indexOf(b.id)
    );
    const sortedLocked = locked.sort(
      (a, b) => classesOnly.indexOf(a.id) - classesOnly.indexOf(b.id)
    );

    return [...sortedUnlocked, ...sortedLocked];
  }

  // For quests view, just sort by user preference (filtering out "Weekly")
  const classesOnly = userOrder.filter((id) => id !== "Weekly");
  return classes.sort(
    (a, b) => classesOnly.indexOf(a.id) - classesOnly.indexOf(b.id)
  );
}

/**
 * Get the position of "Weekly" in the user's class order
 * Returns the index where Weekly should appear, or -1 if not in order
 */
export async function getWeeklyPosition(): Promise<number> {
  const userOrder = await getUserClassOrder();
  return userOrder.indexOf("Weekly");
}

/**
 * Update user's class order
 */
export async function updateClassOrder(newOrder: string[]): Promise<void> {
  await db.user.update("player", { classOrder: newOrder });
}
