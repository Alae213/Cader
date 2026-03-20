# Task List

> The single source of truth for what needs to be done.
> Updated by Claude after every meaningful piece of work.
> Each task links to the feature file it belongs to.
>
> **Status keys:**
> `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` blocked · `[>]` deferred

---

## How Tasks Are Numbered

Tasks are numbered globally across the whole project: T1, T2, T3...
They never get renumbered — a completed task keeps its number forever.
This means you can reference "T12" in a commit message or conversation and
it always points to the same thing.

---

## Active Sprint

Tasks currently being worked on or up next.

<!-- Claude: keep this section short — max 5-7 tasks at a time -->

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T4 | `[~]` | Stage all project files with `git add .` | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | |
| T5 | `[ ]` | Create initial commit with `git commit -m "Initial commit"` | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | |
| T6 | `[ ]` | Create GitHub repository (using GitHub CLI or manual steps) | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | |
| T7 | `[ ]` | Add remote origin to local repository | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | |
| T8 | `[ ]` | Push main branch to GitHub with `git push -u origin main` | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | |

---

## Backlog

Tasks that are planned but not started yet. Ordered by priority.

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| — | — | — | — | — |

---

## Blocked

Tasks that can't proceed until something else is resolved.

| # | Task | Feature | Blocked by |
|---|------|---------|------------|
| — | — | — | — |

---

## Completed

Finished tasks — kept for reference and audit trail.

| # | Task | Feature | Completed |
|---|------|---------|-----------|
| T2 | Initialize Git repository with `git init` | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | 2026-03-20 |
| T3 | Create .gitignore file with appropriate patterns for the project | [context/features/github-repo-setup.md](../features/github-repo-setup.md) | 2026-03-20 |

---

## How to Add a Task

Claude adds tasks using this format:

```
| T[N] | `[ ]` | [What needs to be done — specific and actionable] | [context/features/feature-name.md](../features/feature-name.md) | [any notes] |
```

Rules:
- One task = one clear, completable action
- Link to the feature file if the task belongs to a feature
- Tasks that span multiple features get a note explaining the dependency
- "Implement @auth" is too vague — "Build login form with email/password validation" is a task
- When a task is done, move it to Completed — never delete tasks

---

## Task States

Claude updates task status automatically as work progresses:

| Symbol | Meaning | When to use |
|--------|---------|-------------|
| `[ ]` | Todo | Not started |
| `[~]` | In progress | Currently being worked on |
| `[x]` | Done | Completed and verified |
| `[-]` | Blocked | Waiting on something else |
| `[>]` | Deferred | Decided to push to later phase |
