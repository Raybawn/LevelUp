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

<div class="page">
  <h1 class="page-title" style="margin-bottom: 12px">Settings</h1>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span class="status-icon">💰</span>
      <span>{gold} Gold</span>
    </div>
  </div>

  <div class="panel">Settings (placeholder)</div>
</div>
