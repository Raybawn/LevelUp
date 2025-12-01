<script lang="ts">
  import "../../styles/ui-general.css";
  import { userDB } from "../../db/db";
  import { onMount } from "svelte";

  let gold = 0;

  onMount(async () => {
    const users = await userDB.users.toArray();
    if (users.length > 0) {
      gold = users[0].gold;
    } else {
      await userDB.users.add({ id: "player", gold: 100 });
      gold = 100;
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
