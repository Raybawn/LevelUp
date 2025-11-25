<script lang="ts">
  import "../../styles/quests.css";
  import "../../styles/ui-general.css";
  import CreateQuestModal from "./CreateQuestModal.svelte";
  import { db, type Quest } from "../../db/db";
  import { classConfig } from "../../db/classConfig";

  type QuestCategory = Record<string, Quest[]>;
  type ClassColorMap = Record<string, { color?: string }>;
  const fallbackColor = "#E5E7EB";

  const getCategoryColor = (category: string): string =>
    (classConfig as ClassColorMap)[category]?.color ?? fallbackColor;

  const initialQuests: QuestCategory = {
    Warrior: [
      {
        id: 1,
        title: "Defeat 10 enemies",
        description: "Defeat 10 enemies in the forest",
        type: "Daily",
        class: "Warrior",
        baseXP: 100,
        baseGold: 50,
        enabled: true,
        scaling: false,
      },
      {
        id: 2,
        title: "Collect 5 herbs",
        description: "Gather herbs for potion making",
        type: "Daily",
        class: "Warrior",
        baseXP: 80,
        baseGold: 40,
        enabled: true,
        scaling: false,
      },
    ],
    Sheep: [
      {
        id: 3,
        title: "Shear 3 sheep",
        description: "Shear sheep to collect wool",
        type: "Daily",
        class: "Sheep",
        baseXP: 60,
        baseGold: 30,
        enabled: true,
        scaling: false,
      },
    ],
    Weekly: [
      {
        id: 4,
        title: "Win 3 battles",
        description: "Participate in battles and win",
        type: "Weekly",
        class: "General",
        baseXP: 300,
        baseGold: 150,
        enabled: true,
        scaling: false,
      },
    ],
  };

  let quests: QuestCategory = JSON.parse(
    JSON.stringify(initialQuests)
  ) as QuestCategory;
  let isModalOpen = false;
  let editQuest: Quest | null = null;

  $: groupedQuests = Object.entries(quests).filter(([, questList]) => questList.length > 0);

  function handleSaveQuest(newQuest: Quest) {
    const category = newQuest.type === "Weekly" ? "Weekly" : newQuest.class || "Unknown";
    const next: QuestCategory = { ...quests };
    next[category] = [...(next[category] ?? []), newQuest];
    quests = next;
    isModalOpen = false;
  }

  async function handleEditQuest(updatedQuest: Quest) {
    const newCategory = updatedQuest.type === "Weekly" ? "Weekly" : updatedQuest.class || "Unknown";
    const next: QuestCategory = {};
    for (const [category, list] of Object.entries(quests)) {
      next[category] = list.filter((q) => q.id !== updatedQuest.id);
    }
    next[newCategory] = [...(next[newCategory] ?? []), updatedQuest];
    quests = next;
    await db.quests.put(updatedQuest);
    editQuest = null;
  }

  async function handleDeleteQuest(questToDelete: Quest) {
    const category = questToDelete.type === "Weekly" ? "Weekly" : questToDelete.class || "Unknown";
    const next: QuestCategory = { ...quests };
    next[category] = (next[category] ?? []).filter((q) => q.id !== questToDelete.id);
    quests = next;
    await db.quests.delete(questToDelete.id);
  }
</script>

<div class="quests-root">
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
        <section class="quest-card">
          <div class="quest-card-header">
            <div
              class="header-strip"
              style={`background: ${getCategoryColor(category)};`}
            ></div>
            <div class="header-content">
              <h3 class="header-title">{category}</h3>
            </div>
            <span class="header-count">
              {enabledCount} / {questList.length} {questList.length === 1 ? "Quest" : "Quests"} enabled
            </span>
          </div>

          <ul class="quest-items">
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
                  <button class="btn btn-quest btn-edit" on:click={() => (editQuest = quest)} aria-label="Edit quest">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="btn btn-quest btn-delete" on:click={() => handleDeleteQuest(quest)} aria-label="Delete quest">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
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
    />
  {/if}
</div>
