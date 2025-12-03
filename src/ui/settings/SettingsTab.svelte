<script lang="ts">
  import "../../styles/ui-general.css";
  import { db } from "../../db/db";
  import { ensureInitialized, clearDatabase, initializeDatabase } from "../../db/seed";
  import { onMount } from "svelte";

  let gold = 0;
  let isResetting = false;

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
  </div>
</div>
