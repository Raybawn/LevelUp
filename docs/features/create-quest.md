# Feature: Create Quest

## Goal
Allow users to create new quests with customizable attributes, enabling better tracking and rewarding of tasks.

## User Story
"As a user, I want to create quests with detailed attributes so that I can tailor tasks to my needs and earn appropriate rewards."

## Scope (In/Out)
- **In**: Adding a button to the Quest Tab, opening a modal to create quests with the specified attributes.
- **Out**: Editing or deleting existing quests.

## UX Notes
- **Screens/Components**: Quest Tab, Create Quest Modal.
- **States**: Modal open/close, form validation errors.
- **Controls**:
  - Button to open the modal.
  - Form fields for quest attributes.
  - Save and Cancel buttons.

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
  - `openCreateQuestModal()`
  - `saveQuest(data)`

## Logic
1. Add a "Create Quest" button to the Quest Tab.
2. Clicking the button opens a modal with the following fields:
   - Title (required).
   - Description (optional).
   - Toggle for Type (Daily or Weekly).
   - Toggle to Enable or Disable
   - Class Dropdown (visible if Type = Daily).
   - Base XP (required).
   - Base Gold (required).
   - Toggle for Scaling (Yes/No).
   - Level 1 Requirements (visible if Scaling = Yes).
   - Level 100 Requirements (visible if Scaling = Yes).
   - Requirement (visible if Scaling = No).
3. Validate required fields before saving.
4. Save the quest to the `quests` table in IndexedDB.
5. Close the modal on Save or Cancel.

## Acceptance (Definition of Done)
- [ ] A "Create Quest" button is visible on the Quest Tab.
- [ ] Clicking the button opens the Create Quest Modal.
- [ ] Users can fill out the form and save a quest.
- [ ] Form validation ensures required fields are completed.
- [ ] Data is saved to IndexedDB.
- [ ] Modal closes on Save or Cancel.

## Test Ideas
- **Unit Tests**:
  - Modal opens and closes correctly.
  - Form validation works as expected.
  - Data is saved to IndexedDB with correct attributes.
- **Manual Checks**:
  - Verify UI updates correctly for each action.
  - Test edge cases (e.g., missing required fields, invalid input).

## Follow-ups
- Add support for editing quests.
- Integrate quest creation with notifications.