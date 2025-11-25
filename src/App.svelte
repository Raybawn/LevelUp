<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import Home from "./ui/home/Home.svelte";
  import QuestsTab from "./ui/quests/QuestsTab.svelte";
  import SettingsTab from "./ui/settings/SettingsTab.svelte";
  import { startMaintenance } from "./logic/maintenance";

  const tabs = ["Home", "Quests", "Settings"] as const;
  type Tab = (typeof tabs)[number];

  let tab: Tab = "Home";
  let stopMaintenance: (() => void) | undefined;

  onMount(() => {
    stopMaintenance = startMaintenance();
  });

  onDestroy(() => {
    stopMaintenance?.();
  });
</script>

<div class="app-root">
  <div class="app-main">
    <div class="tab-container">
      {#if tab === "Home"}
        <div class="tab-content" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
          <Home />
        </div>
      {:else if tab === "Quests"}
        <div class="tab-content" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
          <QuestsTab />
        </div>
      {:else}
        <div class="tab-content" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
          <SettingsTab />
        </div>
      {/if}
    </div>
  </div>

  <nav class="app-nav">
    {#each tabs as t}
      <button
        class={`tab-button ${tab === t ? "active" : ""}`}
        aria-current={tab === t ? "true" : undefined}
        on:click={() => (tab = t)}
      >
        {t}
      </button>
    {/each}
  </nav>
</div>
