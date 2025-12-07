<script lang="ts">
  import "../../styles/home.css";
  import "../../styles/ui-general.css";
  import { db, type CharacterClass } from "../../db/db";
  import { ensureInitialized } from "../../db/seed";
  import { completeQuest, rerollQuest, getRerollCost, unlockClass, unlockQuestSlot, collectWeeklyReward, updateQuestProgress, incrementQuestProgress, decrementQuestProgress } from "../../logic/questActions";
  import { getSortedClasses } from "../../logic/classOrdering";
  import { onMount } from "svelte";
  import classConfig from "../../data/classConfig.json";

  let gold = 0;
  let rerollCost = 10;
  let classes: CharacterClass[] = [];
  let questsByClass: Record<string, Array<{ id: number; title: string; description: string; requirementCount: number; progress: number; progressGoal: number; xpReward: number; goldReward: number; type: string; slotIndex: number; status: string }>> = {};

  const CLASS_UNLOCK_COST = 200;
  const SLOT_COSTS = { slot3: 50, slot4: 100, slot5: 150 };
  const SLOT_LEVEL_REQUIREMENTS = { slot3: 5, slot4: 10, slot5: 15 };
  let weeklyBundle: Array<{ id: number; title: string; description: string; requirementCount: number; progress: number; progressGoal: number; xpReward: number; goldReward: number; status: string }> = [];

  let lastLoadDay = new Date().getDate();

  async function loadData() {
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
      rerollCost = getRerollCost(user.dailyRerollCount);
    }

    // Fetch classes and sort by user preference (unlocked first, then locked, within each by preference)
    let unsortedClasses = await db.classes.toArray();
    classes = await getSortedClasses(unsortedClasses, "home");

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
          description: quest.description,
          requirementCount: quest.requirementCount,
          progress: quest.progress,
          progressGoal: quest.progressGoal,
          xpReward: quest.xpReward,
          goldReward: quest.goldReward,
          type: quest.type,
          slotIndex: quest.slotIndex,
          status: quest.status,
        });
      }
    }

    // Load weekly bundle (all weekly quests regardless of class)
    const weeklyAll = await db.questInstances.where('type').equals('Weekly').toArray();
    weeklyBundle = weeklyAll
      .filter(w => w.status !== 'failed')
      .map(w => ({ 
        id: w.id!, 
        title: w.title, 
        description: w.description, 
        requirementCount: w.requirementCount,
        progress: w.progress,
        progressGoal: w.progressGoal,
        xpReward: w.xpReward,
        goldReward: w.goldReward,
        status: w.status 
      }));

    lastLoadDay = new Date().getDate();
  }

  onMount(async () => {
    await ensureInitialized();
    await loadData();

    // Periodically check if day has changed and reload data
    const dayCheckInterval = setInterval(async () => {
      const currentDay = new Date().getDate();
      if (currentDay !== lastLoadDay) {
        await loadData();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(dayCheckInterval);
    };
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

  async function handleProgressInput(questId: number, newValue: string) {
    const value = parseInt(newValue);
    if (!isNaN(value)) {
      try {
        await updateQuestProgress(questId, value);
        await loadData();
      } catch (e: any) {
        console.error("Failed to update progress:", e.message);
      }
    }
  }

  async function handleIncrement(questId: number) {
    try {
      await incrementQuestProgress(questId);
      await loadData();
    } catch (e: any) {
      console.error("Failed to increment progress:", e.message);
    }
  }

  async function handleDecrement(questId: number) {
    try {
      await decrementQuestProgress(questId);
      await loadData();
    } catch (e: any) {
      console.error("Failed to decrement progress:", e.message);
    }
  }

  async function handleCompleteOrCollect(questId: number, progress: number, progressGoal: number) {
    if (progress < progressGoal) {
      // Fill to 100% and change button to "Collect Reward"
      try {
        await updateQuestProgress(questId, progressGoal);
        await loadData();
      } catch (e: any) {
        alert(`Failed to complete quest: ${e.message}`);
      }
    } else {
      // Progress is at 100%, collect reward
      await handleComplete(questId);
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

  function getClassDescription(className: string): string {
    return (classConfig as any)[className]?.description ?? "";
  }
</script>

<div class="space-y-3 page">
  <h1 class="page-title">LevelUp</h1>
  <p class="page-sub">Complete Quests and Level up!</p>
  
  <div class="app-status-bar">
    <div class="status-item">
      <span>Gold: <span style="color:#f59e0b;font-weight:700">{gold}</span></span>
    </div>
    <div class="status-item">
      <span>Reroll Cost: <span style="color:#f59e0b;font-weight:700">{rerollCost}g</span></span>
    </div>
  </div>

  {#each classes as charClass}
    {@const color = getClassColor(charClass.name)}
    {@const colorDimmed = getClassColorDimmed(charClass.name)}
    {@const borderColor = charClass.isUnlocked ? color : "#888"}
    {@const xpPercent = getXPPercentage(charClass)}
    {@const classQuests = questsByClass[charClass.name] || []}
    
    <div class="panel" style="background:{colorDimmed}; border:3px solid {borderColor}; box-shadow: 4px 4px 0 {borderColor}22">
      <div class="class-header">
        <div>
          <h3 class="class-title" style="color:{color}">{charClass.name}</h3>
          <div style="font-size:13px;color:{color};opacity:0.5">{getClassDescription(charClass.name)}</div>
        </div>
        {#if !charClass.isUnlocked}
          <button 
            class="btn btn-primary" 
            style="background:{color};color:#fff"
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
          <div class="xp-bar-bg" style="border-color:{color}">
            <div class="xp-bar-fill" style="width:{xpPercent}%;background:{color}"></div>
          </div>
          <div class="xp-text">
            {charClass.currentXP} / {charClass.xpToNextLevel} XP
          </div>
        </div>

        <!-- Daily Quest Slots: fixed layout with placeholders to prevent UI jumping -->
        <div>
          {#each Array(charClass.dailyQuestSlots) as _, i}
            {@const q = classQuests.find(x => x.type === 'Daily' && x.slotIndex === i)}
            {@const classColor = getClassColor(charClass.name)}
            {#if q}
              {@const isComplete = q.progress >= q.progressGoal}
              {@const progressPercent = (q.progress / q.progressGoal) * 100}
              <div class="quest-progress-card" style="margin-bottom:12px;border-color:{classColor}">
                <!-- Title row with reroll button -->
                <div class="quest-title-row">
                  <div style="flex:1">
                    <strong class="quest-title-text">{q.title}</strong>
                    <span class="quest-type-badge" style="margin-left:6px">Daily</span>
                  </div>
                  <div class="flex-center">
                    <div class="quest-rewards">
                      <div class="quest-xp-reward">{q.xpReward} XP</div>
                      <div class="quest-gold-reward">+{q.goldReward} Gold</div>
                    </div>
                    <button class="btn btn-small" style="background:{classColor};color:#fff;display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0" on:click={() => handleReroll(q.id)} title="Reroll quest">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 4v6h-6"/>
                        <path d="M20.49 15a9 9 0 1 1-2-8.83"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Description -->
                <div class="quest-description">{q.description}</div>

                <!-- Progress input and bar -->
                <div style="margin-bottom:8px">
                  <input 
                    class="quest-progress-input" 
                    type="number"
                    min="0"
                    max={q.progressGoal}
                    value={q.progress}
                    on:input={(e) => handleProgressInput(q.id, e.currentTarget.value)}
                    placeholder="{q.progress} / {q.progressGoal}"
                  />
                  <span class="quest-progress-text">/ {q.progressGoal}</span>
                </div>
                <div class="quest-progress-bar" style="border-color:{classColor}">
                  <div class="quest-progress-bar-fill" style="width:{progressPercent}%;background:{classColor}"></div>
                </div>

                <!-- Action buttons -->
                <div class="quest-button-row">
                  <button class="btn btn-small" style="background:{classColor};color:#fff" on:click={() => handleDecrement(q.id)} aria-label="Decrease progress">−</button>
                  <button 
                    class="btn"
                    class:btn-success={isComplete}
                    style="{isComplete ? '' : `background:${classColor};color:#fff;`}"
                    on:click={() => handleCompleteOrCollect(q.id, q.progress, q.progressGoal)}
                  >
                    {isComplete ? "Collect Reward" : "Complete Quest"}
                  </button>
                  <button class="btn btn-small" style="background:{classColor};color:#fff" on:click={() => handleIncrement(q.id)} aria-label="Increase progress">+</button>
                </div>
              </div>
            {:else}
              <div class="quest-progress-card" style="margin-bottom:12px;border-color:{classColor};opacity:0.6">
                <div>
                  <strong style="font-size:15px">Next quest available tomorrow</strong>
                  <span class="quest-type-badge" style="margin-left:6px">Daily</span>
                  <div style="font-size:13px;color:#64748b;margin-top:4px">Slot {i + 1}</div>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- Quest Slot Unlock Card -->
        {#if charClass.dailyQuestSlots < 5}
          {@const nextSlot = !charClass.slot3Unlocked ? "slot3" : !charClass.slot4Unlocked ? "slot4" : "slot5"}
          {@const nextLevel = SLOT_LEVEL_REQUIREMENTS[nextSlot]}
          {@const nextCost = SLOT_COSTS[nextSlot]}
          {@const canUnlock = gold >= nextCost && charClass.level >= nextLevel}
          <div class="quest-progress-card" style="margin-bottom:12px;border-color:{color};opacity:{canUnlock ? 1 : 0.5}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="flex:1">
                <strong style="font-size:15px">Unlock Quest Slot</strong>
                <div style="font-size:13px;color:#64748b;margin-top:4px">Reach Level {nextLevel}</div>
              </div>
              <button 
                class="btn btn-small"
                style="background:{color};color:#fff;width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center"
                disabled={!canUnlock}
                on:click={() => handleUnlockSlot(charClass.name, nextSlot)}
              >
                +
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/each}

  <!-- Weekly Bundle Panel -->
  {#if weeklyBundle.length > 0}
    <div class="panel weekly-panel">
      <div class="class-header">
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
        {@const isComplete = w.progress >= w.progressGoal}
        {@const progressPercent = (w.progress / w.progressGoal) * 100}
        {#if w.status === 'active'}
          <div class="quest-progress-card" style="margin-bottom:12px">
            <!-- Title row with reroll button -->
            <div class="quest-title-row">
              <div style="flex:1">
                <strong class="quest-title-text">{w.title}</strong>
                <span class="quest-type-badge" style="margin-left:6px">Weekly</span>
              </div>
              <div class="flex-center">
                <div class="quest-rewards">
                  <div class="quest-xp-reward">{w.xpReward} XP</div>
                  <div class="quest-gold-reward">+{w.goldReward} Gold</div>
                </div>
                <button class="btn btn-small" style="background:#4b5563;color:#fff;display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0" on:click={() => handleReroll(w.id)} title="Reroll quest">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"/>
                    <path d="M20.49 15a9 9 0 1 1-2-8.83"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div class="quest-description">{w.description}</div>

            <!-- Progress input and bar -->
            <div style="margin-bottom:8px">
              <input 
                class="quest-progress-input" 
                type="number"
                min="0"
                max={w.progressGoal}
                value={w.progress}
                on:input={(e) => handleProgressInput(w.id, e.currentTarget.value)}
                placeholder="{w.progress} / {w.progressGoal}"
              />
              <span class="quest-progress-text">/ {w.progressGoal}</span>
            </div>
            <div class="quest-progress-bar" style="border-color:#4b5563">
              <div class="quest-progress-bar-fill" style="width:{progressPercent}%;background:#4b5563"></div>
            </div>

            <!-- Action buttons -->
            <div class="quest-button-row">
              <button class="btn btn-small" style="background:#4b5563;color:#fff" on:click={() => handleDecrement(w.id)} aria-label="Decrease progress">−</button>
              <button 
                class="btn"
                class:btn-success={isComplete}
                style="{isComplete ? '' : 'background:#4b5563;color:#fff;'}"
                on:click={() => handleCompleteOrCollect(w.id, w.progress, w.progressGoal)}
              >
                {isComplete ? "Collect Reward" : "Complete Quest"}
              </button>
              <button class="btn btn-small" style="background:#4b5563;color:#fff" on:click={() => handleIncrement(w.id)} aria-label="Increase progress">+</button>
            </div>
          </div>
        {:else}
          <div class="panel-small weekly-completed flex-between" style="gap:8px;margin-bottom:8px">
            <div style="flex:1">
              <strong>{w.title}</strong>
              <span class="quest-type-badge" style="margin-left:6px">Weekly</span>
              <div class="weekly-completed-text muted">{w.description}</div>
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


