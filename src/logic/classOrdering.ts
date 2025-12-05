import { db, type CharacterClass } from "../db/db";

/**
 * Get user's preferred class order
 */
async function getUserClassOrder(): Promise<string[]> {
  const user = await db.user.get("player");
  return (
    user?.classOrder ?? ["Warrior", "Ranger", "Mage", "Bard", "Chef", "Sheep"]
  );
}

/**
 * Sort classes by user preference
 * If viewMode is "home", locked classes are moved to the bottom
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

    // Sort each group by user preference
    const sortedUnlocked = unlocked.sort(
      (a, b) => userOrder.indexOf(a.id) - userOrder.indexOf(b.id)
    );
    const sortedLocked = locked.sort(
      (a, b) => userOrder.indexOf(a.id) - userOrder.indexOf(b.id)
    );

    return [...sortedUnlocked, ...sortedLocked];
  }

  // For quests view, just sort by user preference
  return classes.sort(
    (a, b) => userOrder.indexOf(a.id) - userOrder.indexOf(b.id)
  );
}

/**
 * Update user's class order
 */
export async function updateClassOrder(newOrder: string[]): Promise<void> {
  await db.user.update("player", { classOrder: newOrder });
}
