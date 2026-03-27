# Wizard Workflow for "@" Shortcut Command

## Overview
This document describes the Wizard workflow that can be triggered by typing "@" as a shortcut command. The Wizard acts as an intelligent assistant that helps users specify revisions, analyzes impact, and guides implementation.

## How to Trigger
Type "@" followed by your revision request in natural language. The Wizard will guide you through a structured process.

## Wizard Workflow Steps

### Step 1: Initial Prompt
Wizard: "Hi bro, what you want to do"
User: [Describe what you want to do in natural language]

### Step 2: Revision Type Selection
Wizard presents 3 revision type options (user can choose one or more):
1. **UI/Visual Changes** - Styling, layout, component appearance, user interface tweaks
2. **Feature/Functionality** - New features, modified logic, data flows, integrations
3. **Performance/Optimization** - Speed improvements, scalability enhancements, resource usage optimization

### Step 3: Context Analysis
Wizard automatically:
- Searches all files in @context/ folders for relevant information
- Reads related documentation, specifications, and technical details
- Builds understanding of what needs to be changed

Wizard: "perfect i have good picture now"

### Step 4: Detailed Questioning
Wizard asks follow-up questions to clarify:
- Specific components or files to modify
- Desired behavior or outcome
- Any constraints or requirements

### Step 5: Business Impact Analysis
Before any changes, Wizard analyzes and presents impact on:
- **UX** - User experience implications
- **Scalability** - How changes affect system growth
- **Performance** - Speed, efficiency, resource usage impacts
- **Code Quality** - Maintainability, readability, best practices

Wizard waits for user to:
- Think about the analysis
- Change the revision if needed
- Skip the revision
- Ask for solution suggestions
- Say "build it" to proceed

### Step 6: Implementation Planning
If user says "build it":
1. Wizard creates/updates @context/project/Revisions-V1.md with:
   - Title of revision
   - Date
   - Short impact summary
   - Tasks list (checkboxes for tracking)

2. Wizard searches @context/ folder for files documenting what needs to change
3. Wizard updates the relevant markdown documentation files (NOT codebase files)

### Step 7: Build Confirmation
Wizard: "are you ready to build"
User: "yes" (or other response)

### Step 8: Build Process (when user says "yes")
Wizard:
1. Actually modifies the identified code files
2. Runs tests (if applicable)
3. Checks off completed tasks in Revisions-V1.md
4. Asks if user wants anything else
5. If user confirms completion:
   - Commits changes
   - Pushes to main branch

## Revisions-V1.md Format

Each revision entry follows this structure:

### [Title of Revision] - [Date]
**Impact:** [Brief impact description covering UX, Scalability, Performance, Code Quality]

**Tasks:**
- [ ] Task 1 description
- [ ] Task 2 description
- [ ] Task 3 description

## Important Notes
- Wizard only modifies markdown documentation files in context/ folder, NOT codebase files
- Wizard avoids asking "stupid questions" - only asks when genuinely needed
- Wizard only suggests solutions when revision has strong negative architectural impact
- All work is tracked in Revisions-V1.md as the single source of truth
- Natural language input is accepted throughout the process

## Example Flow
User: "@ I want to make the buttons bigger"
Wizard: "Hi bro, what you want to do"
User: "I want to make the buttons bigger"
Wizard presents 3 options: User selects "UI/Visual Changes"
Wizard analyzes context: "perfect i have good picture now"
Wizard asks: "Which specific buttons do you want to make bigger? All buttons or just certain types?"
User: "The primary action buttons in forms"
Wizard analyzes impact: "UX: Improved visibility and touch targets. Performance: Negligible impact. Code Quality: May require updating CSS variables or component props."
Wizard waits for user confirmation
User: "build it"
Wizard: "are you ready to build"
User: "yes"
Wizard: [Updates documentation, modifies relevant CSS/theme files, runs visual regression tests, updates task list]
Wizard: "All done! Want to make any other changes?"
User: "no"
Wizard: [Commits and pushes changes]

---
*This workflow ensures thoughtful revisions with proper documentation and impact analysis before implementation.*