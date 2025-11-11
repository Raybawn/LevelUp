# Feature: Edit and Delete Quests

## Goal
Enable users to manage quests by editing their attributes or deleting them entirely.

## User Story
"As a user, I want to edit and delete quests so that I can keep my quest list up-to-date and remove unnecessary tasks."

## Scope (In/Out)
- **In**: Adding edit and delete functionality to the Quest Tab.
- **Out**: Bulk editing or deleting quests.

## UX Notes
- **Screens/Components**: Quest Tab, Edit Quest Modal, Delete Confirmation Dialog.
- **States**: Modal open/close, form validation errors, confirmation dialog.
- **Controls**:
  - Edit button/icon next to each quest.
  - Delete button/icon next to each quest.
  - Save and Cancel buttons in the Edit Modal.
  - Confirm and Cancel buttons in the Delete Confirmation Dialog.

## Data & Contracts
- **Tables/Fields**: `quests` table in IndexedDB with fields:
  - `id`: Unique identifier.
  - `title`: Quest title.
  - `description`: Optional description.
  - `type`: Daily or Weekly.
  - `enabled`: Boolean to allow quest to be picked from pool.
  - `class`: Dropdown value (if Daily).
  - `baseXP`: Base XP reward.
  - `baseGold`: Base Gold reward.
  - `scaling`: Boolean for scaling.
  - `level1Requirements`: Requirements for Level 1 (if scaling).
  - `level100Requirements`: Requirements for Level 100 (if scaling).
  - `fixedRequirements`: Fixed Requirements (if no scaling).
  - `createdAt`: Timestamp.
- **Functions/APIs**:
  - `openEditQuestModal(questId)`
  - `saveEditedQuest(data)`
  - `deleteQuest(questId)`

## Logic
1. Add Edit and Delete buttons/icons next to each quest in the Quest Tab.
2. Clicking Edit opens a modal with pre-filled fields:
   - Title (required).
   - Description (optional).
   - Toggle for Type (Daily or Weekly).
   - Toggle to Enable or Disable.
   - Class Dropdown (visible if Type = Daily).
   - Base XP (required).
   - Base Gold (required).
   - Toggle for Scaling (Yes/No).
   - Level 1 Requirements (visible if Scaling = Yes).
   - Level 100 Requirements (visible if Scaling = Yes).
   - Requirement (visible if Scaling = No).
3. Validate required fields before saving edits.
4. Save the edited quest to the `quests` table in IndexedDB.
5. Clicking Delete opens a confirmation dialog.
6. Confirming deletion removes the quest from the `quests` table in IndexedDB.
7. Update the Quest Tab UI dynamically after editing or deleting.

## Acceptance (Definition of Done)
- [ ] Edit and Delete buttons/icons are visible next to each quest.
- [ ] Clicking Edit opens the Edit Quest Modal with pre-filled fields.
- [ ] Users can edit and save quests.
- [ ] Form validation ensures required fields are completed.
- [ ] Clicking Delete opens a confirmation dialog.
- [ ] Confirming deletion removes the quest from IndexedDB.
- [ ] Quest Tab UI updates dynamically after editing or deleting.

## Test Ideas
- **Unit Tests**:
  - Edit Modal opens and closes correctly.
  - Form validation works as expected.
  - Data is updated in IndexedDB with correct attributes.
  - Delete Confirmation Dialog opens and functions correctly.
- **Manual Checks**:
  - Verify UI updates correctly for each action.
  - Test edge cases (e.g., missing required fields, invalid input, canceling deletion).

## Follow-ups
- Add support for bulk editing and deleting quests.
- Display quest history or logs for tracking changes.