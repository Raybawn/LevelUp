<script lang="ts">
  import "../../styles/ui-general.css";
  import { db } from "../../db/db";
  import { ensureInitialized, clearDatabase, initializeDatabase, calculateXPToNextLevel } from "../../db/seed";
  import { generateDailyQuests, generateWeeklyQuests } from "../../logic/questGeneration";
  import { onMount } from "svelte";

  let gold = 0;
  let isResetting = false;
  let isForcing = false;
  let isPreppingWeekly = false;

  onMount(async () => {
    await ensureInitialized();
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
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
</script>

<div class="page">
  <h1 class="page-title" style="margin-bottom: 12px">Settings</h1>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span class="status-icon">💰</span>
      <span>{gold} Gold</span>
    </div>
  </div>

  <div class="panel">
    <h3 style="margin-top: 0; margin-bottom: 8px;">Database</h3>
    <button 
      class="btn btn-secondary" 
      on:click={handleResetDatabase}
      disabled={isResetting}
    >
      {isResetting ? "Resetting..." : "Reset Database (Testing)"}
    </button>
    <div style="height:8px"></div>
    <button
      class="btn btn-primary"
      on:click={handleForceGenerate}
      disabled={isForcing}
    >
      {isForcing ? "Generating..." : "Force Generate Daily/Weekly"}
    </button>
    <div style="height:8px"></div>
    <button
      class="btn btn-secondary"
      on:click={handlePrepWeeklyUnlockTest}
      disabled={isPreppingWeekly}
    >
      {isPreppingWeekly ? "Preparing..." : "Prep Weekly Unlock Test"}
    </button>
  </div>
</div>
