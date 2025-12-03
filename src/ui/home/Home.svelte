<script lang="ts">
  import "../../styles/ui-general.css";
  import { db } from "../../db/db";
  import { ensureInitialized } from "../../db/seed";
  import { onMount } from "svelte";

  let gold = 0;

  onMount(async () => {
    await ensureInitialized();
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
    }
  });
</script>

<div class="space-y-3 page">
  <h1 class="page-title">LevelUp</h1>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span class="status-icon">💰</span>
      <span>{gold} Gold</span>
    </div>
  </div>

  <div class="panel">Weekly (placeholder)</div>
  <div class="panel">ClassCard (placeholder)</div>
</div>
