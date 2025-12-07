<script lang="ts">
  import "../../styles/quests.css";
  import "../../styles/ui-general.css";
  import CreateQuestModal from "./CreateQuestModal.svelte";
  import { db, type QuestTemplate } from "../../db/db";
  import { classConfig } from "../../db/classConfig";
  import { ensureInitialized } from "../../db/seed";
  import { getSortedClasses } from "../../logic/classOrdering";
  import { getRerollCost } from "../../logic/questActions";
  import { onMount } from "svelte";

  type QuestCategory = Record<string, QuestTemplate[]>;
  type ClassColorMap = Record<string, { color?: string }>;
  const fallbackColor = "#E5E7EB";

  const getCategoryColor = (category: string): string =>
    (classConfig as ClassColorMap)[category]?.color ?? fallbackColor;

  const getCategoryColorDimmed = (category: string): string =>
    (classConfig as any)[category]?.colorDimmed ?? "#f8fafc";

  let quests: QuestCategory = {};
  let isModalOpen = false;
  let editQuest: QuestTemplate | null = null;
  let gold = 0;
  let rerollCost = 10;
  let classOrder: string[] = [];

  onMount(async () => {
    await ensureInitialized();
    
    // Load user gold and class order
    const user = await db.user.get("player");
    if (user) {
      gold = user.gold;
      rerollCost = getRerollCost(user.dailyRerollCount);
      classOrder = user.classOrder ?? ["Warrior", "Ranger", "Mage", "Bard", "Chef", "Sheep"];
    }
    
    // Load quest templates from database
    const templates = await db.questTemplates.toArray();
    const grouped: QuestCategory = {};
    
    for (const template of templates) {
      const category = template.type === "Weekly" ? "Weekly" : template.class;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    }
    
    quests = grouped;
  });

  $: groupedQuests = Object.entries(quests)
    .filter(([, questList]) => questList.length > 0)
    .sort(([categoryA], [categoryB]) => {
      // Weekly always last
      if (categoryA === "Weekly") return 1;
      if (categoryB === "Weekly") return -1;
      // Sort by user's classOrder preference
      return classOrder.indexOf(categoryA) - classOrder.indexOf(categoryB);
    });

  async function handleSaveQuest(newQuest: QuestTemplate) {
    // Save to database
    const id = await db.questTemplates.add(newQuest);
    
    // Update local state
    const category = newQuest.type === "Weekly" ? "Weekly" : newQuest.class || "Unknown";
    const next: QuestCategory = { ...quests };
    next[category] = [...(next[category] ?? []), { ...newQuest, id }];
    quests = next;
    isModalOpen = false;
  }

  async function handleEditQuest(updatedQuest: QuestTemplate) {
    // Update in database
    await db.questTemplates.put(updatedQuest);
    
    // Update local state
    const newCategory = updatedQuest.type === "Weekly" ? "Weekly" : updatedQuest.class || "Unknown";
    const next: QuestCategory = {};
    
    for (const [category, list] of Object.entries(quests)) {
      next[category] = list.filter((q) => q.id !== updatedQuest.id);
    }
    
    next[newCategory] = [...(next[newCategory] ?? []), updatedQuest];
    quests = next;
    editQuest = null;
  }

  async function handleDeleteQuest(questToDelete: QuestTemplate) {
    // Delete from database
    await db.questTemplates.delete(questToDelete.id!);
    
    // Update local state
    const category = questToDelete.type === "Weekly" ? "Weekly" : questToDelete.class || "Unknown";
    const next: QuestCategory = { ...quests };
    next[category] = (next[category] ?? []).filter((q) => q.id !== questToDelete.id);
    quests = next;
    editQuest = null;
  }

  async function handleToggleEnabled(quest: QuestTemplate) {
    // Toggle enabled status
    const updated = { ...quest, enabled: !quest.enabled };
    await db.questTemplates.put(updated);
    
    // Update local state
    const category = quest.type === "Weekly" ? "Weekly" : quest.class || "Unknown";
    const next: QuestCategory = { ...quests };
    next[category] = (next[category] ?? []).map((q) => 
      q.id === quest.id ? updated : q
    );
    quests = next;
  }
</script>

<div class="page quests-root">
  <div class="quests-header-row">
    <div>
      <h1 class="page-title">Quest Management</h1>
      <p class="page-sub">Manage your quest templates here.</p>
    </div>
    <button
      class="btn btn-create"
      aria-label="Create Quest"
      on:click={() => (isModalOpen = true)}
    >
      <span class="plus">+</span>
    </button>
  </div>

  <div class="app-status-bar">
    <div class="status-item">
      <span>Gold: <span style="color:#f59e0b;font-weight:700">{gold}</span></span>
    </div>
    <div class="status-item">
      <span>Reroll Cost: <span style="color:#f59e0b;font-weight:700">{rerollCost}g</span></span>
    </div>
  </div>

  <div class="quests-list-wrap">
    {#if groupedQuests.length === 0}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- Scroll (quest) icon with embedded plus -->
        <path d="M8 2h8a2 2 0 0 1 2 2v15a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />
        <path d="M8 2a3 3 0 0 0-3 3c0 1.1.9 2 2 2h1" />
        <path d="M16 2a3 3 0 0 1 3 3c0 1.1-.9 2-2 2h-1" />
        <path d="M12 9v6" />
        <path d="M9 12h6" />
      </svg>
    {:else}
      {#each groupedQuests as [category, questList] (category)}
        {@const enabledCount = questList.filter((q) => q.enabled).length}
        <section class="quest-card" style={`--class-border: ${getCategoryColor(category)};`}>
          <div class="quest-card-header" style={`background: ${getCategoryColorDimmed(category)};`}>
            <div class="header-content">
              <h3 class="header-title" style={`color: ${getCategoryColor(category)};`}>{category}</h3>
            </div>
            <span class="header-count">
              {enabledCount} / {questList.length} {questList.length === 1 ? "Quest" : "Quests"} enabled
            </span>
          </div>

          <ul class="quest-items"  style={`background: ${getCategoryColorDimmed(category)};`}>
            {#each questList as quest (quest.id)}
              <li
                class="quest-item"
                class:is-disabled={!quest.enabled}
              >
                <div class="quest-main">
                  <div class="quest-title">{quest.title}</div>
                  <div class="quest-desc">{quest.description}</div>
                </div>
                <div class="quest-actions">
                  <label class="toggle-switch" aria-label="Toggle quest enabled">
                    <input
                      type="checkbox"
                      checked={quest.enabled}
                      on:change={() => handleToggleEnabled(quest)}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                  <button class="btn btn-quest btn-edit" on:click={() => (editQuest = quest)} aria-label="Edit quest">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
  </div>

  {#if isModalOpen}
    <CreateQuestModal onClose={() => (isModalOpen = false)} onSave={handleSaveQuest} />
  {/if}

  {#if editQuest}
    <CreateQuestModal
      quest={editQuest}
      onClose={() => (editQuest = null)}
      onSave={handleEditQuest}
      onDelete={handleDeleteQuest}
    />
  {/if}
</div>
