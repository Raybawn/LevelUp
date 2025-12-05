<script lang="ts">
  import "../../styles/quests.css";
  import "../../styles/ui-general.css";
  import { userData } from "../../db/userData";
  import type { QuestTemplate } from "../../db/db";

  export let onClose: () => void;
  export let onSave: (quest: QuestTemplate) => void;
  export let onDelete: ((quest: QuestTemplate) => void) | null = null;
  export let quest: QuestTemplate | null = null;

  let title = quest?.title ?? "";
  let description = quest?.description ?? "";
  let type: QuestTemplate["type"] = quest?.type ?? "Daily";
  let enabled = quest?.enabled ?? true;
  let classType = quest?.class ?? userData.unlockedClasses[0] ?? "";
  let baseXP = quest?.baseXP ?? 0;
  let baseGold = quest?.baseGold ?? 0;
  let scaling = quest?.scaling ?? false;
  let level1Requirements = quest?.level1Requirements ?? "";
  let level100Requirements = quest?.level100Requirements ?? "";
  let requirement = quest?.requirement ?? "";
  let idPrefix = quest ? `quest-${quest.id}` : "new-quest";

  $: idPrefix = quest ? `quest-${quest.id}` : "new-quest";

  function handleSubmit() {
    const payload: QuestTemplate = {
      id: quest?.id ?? Date.now(),
      title: title.trim(),
      description: description.trim(),
      type,
      enabled,
      class: type === "Weekly" ? classType || "General" : classType,
      baseXP,
      baseGold,
      scaling,
      level1Requirements: scaling ? level1Requirements.trim() : undefined,
      level100Requirements: scaling ? level100Requirements.trim() : undefined,
      requirement: !scaling ? requirement.trim() : undefined,
      isCustom: true,
      createdAt: quest?.createdAt ?? new Date(),
    };

    onSave(payload);
    onClose();
  }
</script>

<div class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-panel">
    <h2 class="modal-title">{quest ? "Edit Quest" : "Create Quest"}</h2>
    <form class="form-rows" on:submit|preventDefault={handleSubmit}>
      <input
        class="form-input"
        type="text"
        placeholder="Title"
        bind:value={title}
        required
      />
      <textarea
        class="form-input"
        placeholder="Description"
        bind:value={description}
      ></textarea>

      <div class="form-row">
        <label class="form-label" for={`${idPrefix}-type`}>
          Type:
        </label>
        <div class="toggle-row">
          <input
            class="toggle-checkbox"
            type="checkbox"
            checked={type === "Weekly"}
            id={`${idPrefix}-type`}
            on:change={(event) =>
              (type = event.currentTarget.checked ? "Weekly" : "Daily")}
          />
          <span class="muted">Weekly</span>
        </div>
      </div>

      {#if type === "Daily"}
        <div class="form-row">
          <label class="form-label" for={`${idPrefix}-class`}>
            Class:
          </label>
          <select id={`${idPrefix}-class`} class="form-input" bind:value={classType}>
            {#each userData.unlockedClasses as className}
              <option value={className}>{className}</option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="form-row">
        <label class="form-label" for={`${idPrefix}-base-xp`}>
          Base XP:
        </label>
        <input
          class="form-input"
          type="number"
          min="0"
          id={`${idPrefix}-base-xp`}
          bind:value={baseXP}
        />
      </div>

      <div class="form-row">
        <label class="form-label" for={`${idPrefix}-base-gold`}>
          Base Gold:
        </label>
        <input
          class="form-input"
          type="number"
          min="0"
          id={`${idPrefix}-base-gold`}
          bind:value={baseGold}
        />
      </div>

      <div class="form-row">
        <label class="form-label">
          <input
            class="toggle-checkbox"
            type="checkbox"
            bind:checked={enabled}
          />
          Enabled
        </label>
      </div>

      <div class="form-row">
        <label class="form-label">
          <input
            class="toggle-checkbox"
            type="checkbox"
            bind:checked={scaling}
          />
          Scaling
        </label>
      </div>

      {#if scaling}
        <div class="form-row">
          <label class="form-label" for={`${idPrefix}-req-level-1`}>
            Level 1 Requirements:
          </label>
          <input
            class="form-input"
            type="text"
            id={`${idPrefix}-req-level-1`}
            bind:value={level1Requirements}
          />
        </div>
        <div class="form-row">
          <label class="form-label" for={`${idPrefix}-req-level-100`}>
            Level 100 Requirements:
          </label>
          <input
            class="form-input"
            type="text"
            id={`${idPrefix}-req-level-100`}
            bind:value={level100Requirements}
          />
        </div>
      {:else}
        <div class="form-row">
          <label class="form-label" for={`${idPrefix}-requirement`}>
            Requirement:
          </label>
          <input
            class="form-input"
            type="text"
            id={`${idPrefix}-requirement`}
            bind:value={requirement}
          />
        </div>
      {/if}

      <div class="actions">
        {#if quest && onDelete}
          <button 
            type="button" 
            class="btn btn-quest btn-delete" 
            on:click={() => {
              if (confirm(`Delete quest "${quest.title}"?`)) {
                onDelete(quest);
                onClose();
              }
            }}
            aria-label="Delete quest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        {/if}
        <div class="actions-right">
          <button type="button" class="btn btn-secondary" on:click={onClose}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </div>
    </form>
  </div>
</div>
