# Feature: Daily Quests

## Goal
Enable users to manage and complete daily quests, helping them build habits and earn rewards.

## User Story
"As a user, I want to create, view, and complete daily quests so that I can track my daily habits and earn rewards."

## Scope (In/Out)
- **In**: Adding, viewing, editing, and completing daily quests.
- **Out**: Weekly or long-term quests.

## UX Notes
- **Screens/Components**: Daily Quests Tab, Quest Cards.
- **States**: Empty state (no quests), active quests, completed quests.
- **Controls**: Add quest, mark as complete, delete quest.

## Data & Contracts
- **Tables/Fields**: `quests` table in IndexedDB with fields:
  - `id`: Unique identifier.
  - `title`: Quest title.
  - `description`: Optional description.
  - `status`: Active or completed.
  - `createdAt`: Timestamp.
  - `type`: Daily.
- **Functions/APIs**:
  - `addQuest(title, description, type)`
  - `getDailyQuests()`
  - `completeQuest(id)`
  - `deleteQuest(id)`

## Logic
1. Display all active daily quests.
2. Allow users to add a new quest with a title and optional description.
3. Mark quests as complete, moving them to a "Completed" section.
4. Delete quests if needed.
5. Persist all changes in IndexedDB.

## Acceptance (Definition of Done)
- [ ] Users can add daily quests.
- [ ] Users can view a list of active and completed quests.
- [ ] Users can mark quests as complete.
- [ ] Users can delete quests.
- [ ] Data persists across sessions.

## Test Ideas
- **Unit Tests**:
  - Adding a quest updates the `quests` table.
  - Completing a quest changes its status.
  - Deleting a quest removes it from the database.
- **Manual Checks**:
  - Verify UI updates correctly for each action.
  - Test empty states and edge cases (e.g., duplicate titles).

## Follow-ups
- Add notifications for overdue quests.
- Integrate with weekly quest summaries.