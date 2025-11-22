<script lang="ts">
  import "../../styles/quests.css";
  import "../../styles/ui-minimal.css";
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
      class="floating-create btn btn-blue"
      aria-label="Create Quest"
      on:click={() => (isModalOpen = true)}
    >
      <span class="plus">+</span>
    </button>
  </div>

  <div class="quests-list-wrap">
    {#if groupedQuests.length === 0}
      <p class="page-sub">No quests yet. Add one to get started.</p>
    {:else}
      {#each groupedQuests as [category, questList] (category)}
        <section class="quest-card">
          <div class="quest-card-header">
            <div
              class="header-strip"
              style={`background: ${getCategoryColor(category)};`}
            ></div>
            <div class="header-content">
              <h3 class="header-title">{category}</h3>
            </div>
            <span class="header-count">{questList.length} quests</span>
          </div>

          <ul class="quest-items">
            {#each questList as quest (quest.id)}
              <li class="quest-item">
                <div class="quest-main">
                  <div class="quest-title">{quest.title}</div>
                  <div class="quest-desc">{quest.description}</div>
                </div>
                <div class="quest-actions">
                  <button class="btn btn-yellow" on:click={() => (editQuest = quest)}>
                    Edit
                  </button>
                  <button class="btn btn-red" on:click={() => handleDeleteQuest(quest)}>
                    Delete
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
