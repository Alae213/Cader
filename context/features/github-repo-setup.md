# Feature: GitHub repo setup

> **Status:** `draft`
> **Phase:** v1 (setup/infrastructure)
> **Last updated:** 2026-03-20

---

## Summary

This feature initializes a Git repository for the project, creates a new GitHub repository (using GitHub CLI or manual steps), adds the remote origin, commits all existing files, and pushes to GitHub. This establishes version control and remote backup for the project, enabling collaboration and change tracking from the start.

---

## Users

**Developer** (the person setting up the project) - This is a setup task performed once at the beginning of the project lifecycle.

---

## User Stories

- As a **developer**, I want to **initialize a Git repository** so that I can track changes to my project files and maintain version history.
- As a **developer**, I want to **create a GitHub repository** so that I can have a remote backup and enable collaboration with others.
- As a **developer**, I want to **push my project to GitHub** so that I can access it from anywhere and share it with team members or the public.

---

## Behaviour

### Happy Path

1. Developer runs `git init` to initialize a local Git repository in the project root.
2. Developer creates a `.gitignore` file with appropriate patterns for the project (excluding sensitive files, node_modules, etc.).
3. Developer stages all project files with `git add .`.
4. Developer makes an initial commit with `git commit -m "Initial commit"`.
5. Developer creates a new GitHub repository using one of these methods:
   - **Option A (GitHub CLI):** Run `gh repo create` with appropriate flags
   - **Option B (Manual):** Create repository via GitHub website and copy the URL
6. Developer adds the remote origin with `git remote add origin <repository-url>`.
7. Developer pushes the main branch to GitHub with `git push -u origin main`.

### Edge Cases & Rules

- **Git not installed:** Process fails with clear error message instructing user to install Git.
- **GitHub CLI not installed:** Fall back to manual repository creation steps with clear instructions.
- **Repository already exists on GitHub:** Push may fail due to non-fast-forward errors; need to handle by either force pushing (if appropriate) or pulling first.
- **Large files present:** Consider using Git LFS for files >100MB (not required for MVP).
- **Missing .gitignore:** Sensitive or unnecessary files may be committed; must create .gitignore before initial commit.
- **Authentication issues:** GitHub CLI may require authentication; manual method requires user to be logged into GitHub.
- **Branch naming:** Default branch should be `main` (not `master`) to follow modern conventions.
- **Empty repository:** If GitHub repository is created empty, push should succeed; if created with README, may need to pull first.

---

## Connections

- **Depends on:** None (this is a setup/infrastructure feature)
- **Triggers:** None
- **Shares data with:** None

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|--------|----------|--------------|
| Git initialization | Required | Required |
| .gitignore creation | Required (basic patterns) | Enhanced with project-specific patterns, IDE files, OS files |
| GitHub repository creation | Required (manual or CLI) | Automated with CI/CD setup, branch protection rules |
| Push to GitHub | Required | Required |
| Branch strategy | Single main branch | Feature branches, PR workflow, branch protection |
| GitHub Actions | Not included | CI/CD pipeline setup, automated testing, deployment |
| Repository settings | Basic (public/private) | Topics, description, website, social preview, auto-generated docs |

---

## Security Considerations

> Based on context/developer/SECURITY.md

- **Secrets and credentials:** Ensure no sensitive data (API keys, passwords, tokens, environment variables) is committed to the repository.
- **.gitignore requirements:** Must include patterns for `.env` files, credentials, and other sensitive files before initial commit.
- **GitHub authentication:** If using GitHub CLI, ensure authentication is secure (token stored securely, not in code or logs).
- **Never commit:** GitHub personal access tokens, OAuth secrets, private keys, or any credentials.
- **Repository visibility:** Consider whether repository should be public or private based on project sensitivity.

---

## Tasks

> Granular implementation steps for this feature.
> Each task has a global T-number that matches TASK-LIST.md.
> Keep status here in sync with the central task list.
>
> Status: [ ] todo  [~] in progress  [x] done  [-] blocked  [>] deferred

| Task # | Status | What needs to be done |
|--------|--------|-----------------------|
| T2 | `[x]` | Initialize Git repository with `git init` |
| T3 | `[x]` | Create .gitignore file with appropriate patterns for the project |
| T4 | `[~]` | Stage all project files with `git add .` |
| T5 | `[ ]` | Create initial commit with `git commit -m "Initial commit"` |
| T6 | `[ ]` | Create GitHub repository (using GitHub CLI or manual steps) |
| T7 | `[ ]` | Add remote origin to local repository |
| T8 | `[ ]` | Push main branch to GitHub with `git push -u origin main` |

---

## User Acceptance Tests

> Plain-English browser tests generated after this feature is built.
> The full interactive checklist lives in [feature-name]-uat.md once generated.
>
> UAT status: `pending` | `in-progress` | `passed` | `failed` | `partial`

**UAT Status:** `pending`

**Last tested:** —

**Outcome:** —

<!-- After UAT, record a brief summary here:
     "Passed — all 4 steps working as expected"
     "Failed — Step 2 (wrong password) showed a blank screen instead of error message"
     "Partial — Steps 1-3 passed, Step 4 (email confirmation) not yet set up" -->

---

## Open Questions

- [ ] Should we use GitHub CLI (`gh`) or manual repository creation? (CLI requires installation but is more automated)
- [ ] What should the repository name be? (Default: project folder name)
- [ ] Should the repository be public or private? (Default: private for initial development)
- [ ] Should we create a .gitignore file automatically or ask the user for preferences?
- [ ] Should we initialize with a specific branch name? (Default: main)

---

## Notes

- This is a setup/infrastructure feature, not a user-facing feature of the Archē framework.
- The feature assumes the user has Git installed and optionally GitHub CLI installed.
- For manual repository creation, clear step-by-step instructions should be provided.
- Consider adding a check for existing .git directory to avoid re-initialization.

---

## Archive

<!-- Outdated content goes here — never delete, just move down -->