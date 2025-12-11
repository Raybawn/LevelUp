<script lang="ts">
  import "../../styles/general.css";
  import "../../styles/ui-general.css";
  import { db } from "../../db/db";
  import { ensureInitialized, clearDatabase, initializeDatabase, calculateXPToNextLevel } from "../../db/seed";
  import { generateDailyQuests, generateWeeklyQuests } from "../../logic/questGeneration";
  import { updateClassOrder } from "../../logic/classOrdering";
  import { getRerollCost } from "../../logic/questActions";
  import { onMount } from "svelte";
  import classConfig from "../../data/classConfig.json";

  let gold = 0;
  let rerollCost = 10;
  let isResetting = false;
  let isForcing = false;
  let isPreppingWeekly = false;
  let classOrder: string[] = [];

  onMount(async () => {
    await ensureInitialized();
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
      rerollCost = getRerollCost(user.dailyRerollCount);
      classOrder = user.classOrder ?? ["Warrior", "Ranger", "Mage", "Bard", "Chef", "Sheep"];
    }
  });

  async function handleResetDatabase() {
    if (!confirm("This will delete ALL data and reinitialize the database. Are you sure?")) {
      return;
    }
    
    isResetting = true;
    try {
      await clearDatabase();
      await initializeDatabase();
      alert("Database reset successfully! Refreshing page...");
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset database:", error);
      alert("Failed to reset database. Check console for details.");
    } finally {
      isResetting = false;
    }
  }

  async function handleForceGenerate() {
    isForcing = true;
    try {
      const now = new Date();
      // Reset rerolls and mark activity
      await db.user.update("player", {
        dailyRerollCount: 0,
        lastRerollReset: now,
        lastActive: new Date(0), // ensure maintenance logic sees new day/week
      });
      // Directly generate fresh quests
      await generateDailyQuests();
      await generateWeeklyQuests();
      // Reload gold (optional visual feedback remains)
      const user = await db.user.get("player");
      gold = user?.gold ?? gold;
      alert("Daily and weekly quests generated.");
    } catch (e) {
      console.error("Force generate failed", e);
      alert("Failed to generate quests. See console for details.");
    } finally {
      isForcing = false;
    }
  }

  async function handlePrepWeeklyUnlockTest() {
    isPreppingWeekly = true;
    try {
      const classes = await db.classes.toArray();
      for (const cls of classes) {
        // Set to level 4 with currentXP such that one typical quest completes level 5
        const level = 4;
        const xpToNext = calculateXPToNextLevel(level);
        const typicalQuestXP = 100; // baseline daily XP
        const currentXP = Math.max(0, xpToNext - typicalQuestXP);
        await db.classes.update(cls.id, {
          level,
          currentXP,
          xpToNextLevel: calculateXPToNextLevel(level),
        });
      }
      alert("Classes set to level 4 with ~1 quest to reach level 5. Complete one quest per class to test weekly unlock.");
    } catch (e) {
      console.error("Prep weekly unlock test failed", e);
      alert("Failed to prep classes. See console for details.");
    } finally {
      isPreppingWeekly = false;
    }
  }

  function moveClass(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= classOrder.length) return;

    const newOrder = [...classOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    classOrder = newOrder;
    updateClassOrder(classOrder);
  }

  function getClassColor(className: string): string {
    return (classConfig as any)[className]?.color ?? "#888";
  }
</script>

<div class="page">
  <h1 class="page-title">Settings</h1>
  <p class="page-sub">Change different options here.</p>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span>Gold: <span class="text-golden">{gold}</span></span>
    </div>
    <div class="status-item">
      <span>Reroll Cost: <span class="text-golden">{rerollCost}g</span></span>
    </div>
  </div>

  <div class="card-container" style="margin-bottom: 20px;">
    <div style="padding: 12px 12px; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Class Order</h3>
    </div>
    <div style="padding: 0 12px; margin-bottom: 12px;">
      <p class="text-small text-muted" style="margin: 0 0 12px 0;">
        Arrange your classes in the order you'd like them to appear.
      </p>
      <div class="class-order-list">
      {#each classOrder as className, index (className)}
        <div class="class-order-item" style="background: {getClassColor(className)}20; border-color: {getClassColor(className)};">
          <span class="class-name" style="color: {getClassColor(className)};">{className}</span>
          <div class="class-order-buttons">
            <button
              class="btn btn-small"
              on:click={() => moveClass(index, "up")}
              disabled={index === 0}
              aria-label="Move {className} up"
            >
              ↑
            </button>
            <button
              class="btn btn-small"
              on:click={() => moveClass(index, "down")}
              disabled={index === classOrder.length - 1}
              aria-label="Move {className} down"
            >
              ↓
            </button>
          </div>
        </div>
      {/each}
      </div>
    </div>
  </div>

  <div class="card-container" style="margin-bottom: 20px;">
    <div style="padding: 12px 12px; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Database</h3>
    </div>
    <div style="padding: 0 12px; margin-bottom: 12px;">
      <button 
        class="btn btn-secondary" 
        on:click={handleResetDatabase}
        disabled={isResetting}
      >
        {isResetting ? "Resetting..." : "Reset Database (Testing)"}
      </button>
      <div class="spacing-8"></div>
      <button
        class="btn btn-primary"
        on:click={handleForceGenerate}
        disabled={isForcing}
      >
        {isForcing ? "Generating..." : "Force Generate Daily/Weekly"}
      </button>
      <div class="spacing-8"></div>
      <button
        class="btn btn-secondary"
        on:click={handlePrepWeeklyUnlockTest}
        disabled={isPreppingWeekly}
      >
        {isPreppingWeekly ? "Preparing..." : "Prep Weekly Unlock Test"}
      </button>
    </div>
  </div>
</div>

<style>
  .class-order-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .class-order-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 4px;
    font-weight: 500;
  }

  .class-name {
    flex: 1;
    color: #111827;
  }

  .class-order-buttons {
    display: flex;
    gap: 4px;
  }

  .btn-small {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .btn-small:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    .class-order-item {
      background: #1f2937;
      border-color: #374151;
    }

    .class-name {
      color: #f3f4f6;
    }
  }
</style>
