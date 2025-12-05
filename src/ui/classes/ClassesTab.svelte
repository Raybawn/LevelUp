<script lang="ts">
  import { onMount } from "svelte";
  import { db, type CharacterClass } from "../../db/db";
  import { unlockClass, unlockQuestSlot } from "../../logic/questActions";
  import { classConfig } from "../../db/classConfig";

  let classes: CharacterClass[] = [];
  let gold = 0;

  const CLASS_UNLOCK_COST = 200;
  const SLOT_COSTS = { slot3: 50, slot4: 100, slot5: 150 };
  const SLOT_LEVEL_REQUIREMENTS = { slot3: 5, slot4: 10, slot5: 15 };

  onMount(() => {
    loadClasses();
  });

  async function loadClasses() {
    classes = await db.classes.orderBy("name").toArray();
    const user = await db.user.get("player");
    gold = user?.gold ?? 0;
  }

  async function handleUnlockClass(className: string) {
    try {
      await unlockClass(className);
      alert(`Unlocked ${className} for ${CLASS_UNLOCK_COST}g!`);
      await loadClasses();
    } catch (err: any) {
      alert(`Failed to unlock class: ${err.message}`);
    }
  }

  async function handleUnlockSlot(className: string, slot: "slot3" | "slot4" | "slot5") {
    const cost = SLOT_COSTS[slot];
    const requiredLevel = SLOT_LEVEL_REQUIREMENTS[slot];
    const confirmed = confirm(
      `Unlock quest slot for ${cost}g?\nRequires level ${requiredLevel}.`
    );
    if (!confirmed) return;

    try {
      await unlockQuestSlot(className, slot);
      alert(`Unlocked quest slot for ${className}!`);
      await loadClasses();
    } catch (err: any) {
      alert(`Failed to unlock slot: ${err.message}`);
    }
  }

  function getXPPercentage(charClass: CharacterClass): number {
    if (charClass.level >= 100) return 100;
    return (charClass.currentXP / charClass.xpToNextLevel) * 100;
  }

  function getClassColor(className: string): string {
    return (classConfig as any)[className]?.color ?? "#888";
  }
</script>

<div class="classes-root">
  <div class="header">
    <h2>Classes</h2>
    <div class="gold-display">{gold}g</div>
  </div>

  <div class="classes-grid">
    {#each classes as charClass}
      {@const color = getClassColor(charClass.name)}
      {@const xpPercent = getXPPercentage(charClass)}
      
      <div class="class-card" style="border-left: 4px solid {color}">
        <div class="class-header">
          <h3 style="margin:0;color:{color}">{charClass.name}</h3>
          {#if !charClass.isUnlocked}
            <span class="locked-badge">🔒 Locked</span>
          {:else}
            <span class="level-badge">Level {charClass.level}</span>
          {/if}
        </div>

        {#if !charClass.isUnlocked}
          <div style="margin-top:12px">
            <button 
              class="btn btn-primary" 
              disabled={gold < CLASS_UNLOCK_COST}
              on:click={() => handleUnlockClass(charClass.name)}
            >
              Unlock Class ({CLASS_UNLOCK_COST}g)
            </button>
          </div>
        {:else}
          <!-- XP Progress Bar -->
          <div class="xp-section">
            <div class="xp-bar-bg">
              <div class="xp-bar-fill" style="width:{xpPercent}%"></div>
            </div>
            <div class="xp-text">
              {charClass.currentXP} / {charClass.xpToNextLevel} XP
            </div>
          </div>

          <!-- Quest Slots -->
          <div class="slots-section">
            <div class="slots-header">Daily Quest Slots: {charClass.dailyQuestSlots}/5</div>
            <div class="slots-buttons">
              <!-- Slot 3 -->
              {#if !charClass.slot3Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot3 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot3}
                  on:click={() => handleUnlockSlot(charClass.name, "slot3")}
                >
                  +1 Slot (Lv{SLOT_LEVEL_REQUIREMENTS.slot3}, {SLOT_COSTS.slot3}g)
                </button>
              {/if}
              <!-- Slot 4 -->
              {#if charClass.slot3Unlocked && !charClass.slot4Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot4 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot4}
                  on:click={() => handleUnlockSlot(charClass.name, "slot4")}
                >
                  +1 Slot (Lv{SLOT_LEVEL_REQUIREMENTS.slot4}, {SLOT_COSTS.slot4}g)
                </button>
              {/if}
              <!-- Slot 5 -->
              {#if charClass.slot4Unlocked && !charClass.slot5Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot5 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot5}
                  on:click={() => handleUnlockSlot(charClass.name, "slot5")}
                >
                  +1 Slot (Lv{SLOT_LEVEL_REQUIREMENTS.slot5}, {SLOT_COSTS.slot5}g)
                </button>
              {/if}
              {#if charClass.dailyQuestSlots >= 5}
                <div class="muted" style="font-size:13px">All slots unlocked!</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .classes-root {
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .gold-display {
    font-size: 20px;
    font-weight: 600;
    color: #d4af37;
  }

  .classes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .class-card {
    background: #f8fafc;
    border: 3px solid #000;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  }

  .class-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .locked-badge {
    font-size: 13px;
    color: #888;
  }

  .level-badge {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .xp-section {
    margin-top: 12px;
  }

  .xp-bar-bg {
    height: 20px;
    background: #e0e0e0;
    border: 2px solid #000;
    border-radius: 4px;
    overflow: hidden;
  }

  .xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.3s ease;
  }

  .xp-text {
    margin-top: 4px;
    font-size: 13px;
    color: #555;
    text-align: center;
  }

  .slots-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
  }

  .slots-header {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .slots-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 13px;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .class-card {
      background: #202020;
      border-color: #fff;
    }

    .level-badge {
      color: #fff;
    }

    .xp-bar-bg {
      background: #333;
      border-color: #fff;
    }

    .xp-text {
      color: #aaa;
    }

    .slots-section {
      border-top-color: #444;
    }
  }
</style>
