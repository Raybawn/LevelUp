import { db } from "../db/db";
import { generateDailyQuests, generateWeeklyQuests } from "./questGeneration";

function isNewDay(last: Date): boolean {
  const now = new Date();
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.getTime() !== lastDay.getTime();
}

function isNewWeek(last: Date): boolean {
  const now = new Date();
  const lastWeekSunday = new Date(last);
  lastWeekSunday.setDate(last.getDate() - last.getDay());
  lastWeekSunday.setHours(0, 0, 0, 0);
  const thisWeekSunday = new Date(now);
  thisWeekSunday.setDate(now.getDate() - now.getDay());
  thisWeekSunday.setHours(0, 0, 0, 0);
  return lastWeekSunday.getTime() !== thisWeekSunday.getTime();
}

async function tick() {
  const user = await db.user.get("player");
  const now = new Date();
  if (!user) return;

  // Daily maintenance
  if (isNewDay(user.lastActive)) {
    // Reset reroll counters
    await db.user.update("player", {
      dailyRerollCount: 0,
      lastRerollReset: now,
      lastActive: now,
    });
    await generateDailyQuests();
  }

  // Weekly maintenance
  if (isNewWeek(user.lastActive)) {
    await generateWeeklyQuests();
  }
}

export function startMaintenance(): () => void {
  const tickWrapper = () => {
    tick().catch((e) => console.error("Maintenance error", e));
  };
  tickWrapper();
  const id = setInterval(tickWrapper, 60_000);
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      tickWrapper();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
