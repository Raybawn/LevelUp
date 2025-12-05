<script lang="ts">
  import "../../styles/home.css";
  import "../../styles/ui-general.css";
  import { db, type CharacterClass } from "../../db/db";
  import { ensureInitialized } from "../../db/seed";
  import { completeQuest, rerollQuest, getRerollCost, unlockClass, unlockQuestSlot, collectWeeklyReward } from "../../logic/questActions";
  import { onMount } from "svelte";
  import classConfig from "../../data/classConfig.json";

  let gold = 0;
  let rerollCost = 10;
  let classes: CharacterClass[] = [];
  let questsByClass: Record<string, Array<{ id: number; title: string; requirement: string; type: string; slotIndex: number }>> = {};

  const CLASS_UNLOCK_COST = 200;
  const SLOT_COSTS = { slot3: 50, slot4: 100, slot5: 150 };
  const SLOT_LEVEL_REQUIREMENTS = { slot3: 5, slot4: 10, slot5: 15 };
  let weeklyBundle: Array<{ id: number; title: string; requirement: string; status: string }> = [];

  async function loadData() {
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
      rerollCost = getRerollCost(user.dailyRerollCount);
    }

    // Fetch classes and sort by name (avoid Dexie orderBy on non-indexed 'name')
    classes = await db.classes.toArray();
    // Sort unlocked first, then by name
    classes.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const active = await db.questInstances.where('status').equals('active').toArray();
    
    // Group quests by class (Daily quests only; Weekly quests handled separately)
    questsByClass = {};
    for (const quest of active) {
      if (quest.type === 'Daily') {
        if (!questsByClass[quest.class]) {
          questsByClass[quest.class] = [];
        }
        questsByClass[quest.class].push({
          id: quest.id!,
          title: quest.title,
          requirement: quest.requirement,
          type: quest.type,
          slotIndex: quest.slotIndex,
        });
      }
    }

    // Load weekly bundle (all weekly quests regardless of class)
    const weeklyAll = await db.questInstances.where('type').equals('Weekly').toArray();
    weeklyBundle = weeklyAll
      .filter(w => w.status !== 'failed')
      .map(w => ({ id: w.id!, title: w.title, requirement: w.requirement, status: w.status }));
  }

  onMount(async () => {
    await ensureInitialized();
    await loadData();
  });

  async function handleComplete(questId: number) {
    try {
      const result = await completeQuest(questId);
      // Only show feedback for Daily quests (Weekly quests give 0 reward)
      if (result.goldAwarded > 0 || result.xpAwarded > 0) {
        alert(`Quest completed!\n+${result.goldAwarded} gold\n+${result.xpAwarded} XP (${result.className})${result.leveledUp ? `\n🎉 Level UP! Now level ${result.newLevel}` : ''}`);
      }
      await loadData();
    } catch (e: any) {
      alert(`Failed to complete quest: ${e.message}`);
    }
  }

  async function handleReroll(questId: number) {
    if (!confirm(`Reroll this quest for ${rerollCost} gold?\nCost increases with each reroll today.`)) {
      return;
    }
    
    try {
      const result = await rerollQuest(questId);
      alert(`Quest rerolled for ${result.cost} gold!\nNew quest: ${result.newQuestTitle}`);
      await loadData();
    } catch (e: any) {
      alert(`Failed to reroll: ${e.message}`);
    }
  }

  async function handleUnlockClass(className: string) {
    try {
      await unlockClass(className);
      alert(`Unlocked ${className} for ${CLASS_UNLOCK_COST}g!`);
      await loadData();
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
      await loadData();
    } catch (err: any) {
      alert(`Failed to unlock slot: ${err.message}`);
    }
  }

  async function handleCollectWeekly() {
    try {
      const result = await collectWeeklyReward();
      alert(`Weekly reward collected!\n+${result.goldAwarded} gold\n+${result.totalXPDistributed} XP distributed across classes`);
      await loadData();
    } catch (err: any) {
      alert(`Cannot collect weekly reward: ${err.message}`);
    }
  }

  function getXPPercentage(charClass: CharacterClass): number {
    if (charClass.level >= 100) return 100;
    return (charClass.currentXP / charClass.xpToNextLevel) * 100;
  }

  function getClassColor(className: string): string {
    return (classConfig as any)[className]?.color ?? "#888";
  }

  function getClassColorDimmed(className: string): string {
    return (classConfig as any)[className]?.colorDimmed ?? "#88888820";
  }
</script>

<div class="space-y-3 page">
  <h1 class="page-title">LevelUp</h1>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span class="status-icon">💰</span>
      <span>{gold} Gold</span>
    </div>
  </div>

  {#each classes as charClass}
    {@const color = getClassColor(charClass.name)}
    {@const colorDimmed = getClassColorDimmed(charClass.name)}
    {@const borderColor = charClass.isUnlocked ? color : "#888"}
    {@const xpPercent = getXPPercentage(charClass)}
    {@const classQuests = questsByClass[charClass.name] || []}
    
    <div class="panel" style="background:{colorDimmed}; border:3px solid {borderColor}; box-shadow: 4px 4px 0 {borderColor}22">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0;color:{color}">{charClass.name}</h3>
        {#if !charClass.isUnlocked}
          <button 
            class="btn btn-primary" 
            disabled={gold < CLASS_UNLOCK_COST}
            on:click={() => handleUnlockClass(charClass.name)}
          >
            🔒 Unlock ({CLASS_UNLOCK_COST}g)
          </button>
        {:else}
          <span class="level-badge">Level {charClass.level}</span>
        {/if}
      </div>

      {#if !charClass.isUnlocked}
        <div class="muted">Unlock this class to start leveling!</div>
      {:else}
        <!-- XP Progress Bar -->
        <div style="margin-bottom:12px">
          <div class="xp-bar-bg">
            <div class="xp-bar-fill" style="width:{xpPercent}%"></div>
          </div>
          <div class="xp-text">
            {charClass.currentXP} / {charClass.xpToNextLevel} XP
          </div>
        </div>

        <!-- Quest Slots Info & Upgrades -->
        <div style="margin-bottom:12px;padding:8px;background:rgba(0,0,0,0.05);border-radius:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span style="font-weight:600;font-size:14px">Daily Quest Slots: {charClass.dailyQuestSlots}/5</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              {#if !charClass.slot3Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot3 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot3}
                  on:click={() => handleUnlockSlot(charClass.name, "slot3")}
                >
                  +1 (Lv{SLOT_LEVEL_REQUIREMENTS.slot3}, {SLOT_COSTS.slot3}g)
                </button>
              {/if}
              {#if charClass.slot3Unlocked && !charClass.slot4Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot4 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot4}
                  on:click={() => handleUnlockSlot(charClass.name, "slot4")}
                >
                  +1 (Lv{SLOT_LEVEL_REQUIREMENTS.slot4}, {SLOT_COSTS.slot4}g)
                </button>
              {/if}
              {#if charClass.slot4Unlocked && !charClass.slot5Unlocked}
                <button 
                  class="btn btn-small btn-secondary"
                  disabled={gold < SLOT_COSTS.slot5 || charClass.level < SLOT_LEVEL_REQUIREMENTS.slot5}
                  on:click={() => handleUnlockSlot(charClass.name, "slot5")}
                >
                  +1 (Lv{SLOT_LEVEL_REQUIREMENTS.slot5}, {SLOT_COSTS.slot5}g)
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Daily Quest Slots: fixed layout with placeholders to prevent UI jumping -->
        <div>
          {#each Array(charClass.dailyQuestSlots) as _, i}
            {@const q = classQuests.find(x => x.type === 'Daily' && x.slotIndex === i)}
            {#if q}
              <div class="panel-small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                <div style="flex:1">
                  <strong>{q.title}</strong>
                  <span class="quest-type-badge" style="margin-left:6px">Daily</span>
                  <div style="margin-top:4px;font-size:14px">{q.requirement}</div>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-edit" on:click={() => handleReroll(q.id)}>🔄 {rerollCost}g</button>
                  <button class="btn btn-primary" on:click={() => handleComplete(q.id)}>✓</button>
                </div>
              </div>
            {:else}
              <div class="panel-small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;opacity:0.6">
                <div style="flex:1">
                  <strong>Next quest available tomorrow</strong>
                  <span class="quest-type-badge" style="margin-left:6px">Daily</span>
                  <div style="margin-top:4px;font-size:14px" class="muted">Slot {i + 1}</div>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-edit" disabled>🔄</button>
                  <button class="btn" disabled>✓</button>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- Weekly quests appear when unlocked milestone is met; render all weekly for this class -->
        {#each classQuests.filter(x => x.type === 'Weekly') as wq}
          <div class="panel-small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
            <div style="flex:1">
              <strong>{wq.title}</strong>
              <span class="quest-type-badge" style="margin-left:6px">Weekly</span>
              <div style="margin-top:4px;font-size:14px">{wq.requirement}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-edit" on:click={() => handleReroll(wq.id)}>🔄 {rerollCost}g</button>
              <button class="btn btn-primary" on:click={() => handleComplete(wq.id)}>✓</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/each}

  <!-- Weekly Bundle Panel -->
  {#if weeklyBundle.length > 0}
    <div class="panel" style="border:3px solid #4b5563; border-left: 6px solid #4b5563; box-shadow: 4px 4px 0 #4b556322">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0">Weekly Quests</h3>
        <button 
          class="btn btn-primary"
          on:click={handleCollectWeekly}
          disabled={!weeklyBundle.every(w => w.status === 'completed')}
        >
          Collect Weekly Reward
        </button>
      </div>
      {#each weeklyBundle as w}
        {#if w.status === 'active'}
          <div class="panel-small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
            <div style="flex:1">
              <strong>{w.title}</strong>
              <span class="quest-type-badge" style="margin-left:6px">Weekly</span>
              <div style="margin-top:4px;font-size:14px">{w.requirement}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-edit" on:click={() => handleReroll(w.id)}>🔄 {rerollCost}g</button>
              <button class="btn btn-primary" on:click={() => handleComplete(w.id)}>✓</button>
            </div>
          </div>
        {:else}
          <div class="panel-small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;opacity:0.7">
            <div style="flex:1">
              <strong>{w.title}</strong>
              <span class="quest-type-badge" style="margin-left:6px">Weekly</span>
              <div style="margin-top:4px;font-size:14px">{w.requirement}</div>
            </div>
            <div style="display:flex;gap:6px">
              <span class="muted" style="font-size:13px">✓ {w.status}</span>
            </div>
          </div>
        {/if}
      {/each}
      <div class="muted" style="font-size:13px;margin-top:8px">Complete all weekly quests to collect the combined reward (sum × 3). XP is distributed to all unlocked classes.</div>
    </div>
  {/if}
</div>


