---
name: plan-and-delegate
description: Plan a large feature that touches several parts of the app, split it into small reviewable tasks with self-contained briefs, and track progress. Use when the user asks to plan, break down, or delegate a feature, or when a request spans database, auth, UI, and deployment.
---

# Plan and delegate

Use this for work that is too big for one chat. You are the planner and reviewer. You do not build the whole feature in this chat.

## Step 1: Understand

1. Read `docs/project/STATE.md` and the code areas the feature will touch.
2. Ask the user only the questions that would change the plan (at most three, asked together). State your assumptions for everything else.

## Step 2: Write the plan

Create `docs/project/plans/<feature-name>.md` containing:

- **Goal** and **non-goals** (what we are deliberately not doing).
- **Design**: the approach, in plain language. Include database changes, new routes, auth and permission rules, and what runs on the server vs the client.
- **Risks**: security (who can access what, what input is untrusted) and performance (new queries, caching, bundle size).
- **Tasks**: an ordered list. Each task must be small enough to review in one sitting and must leave the app working. Prefer vertical slices (a thin end-to-end piece) over layers (all the database, then all the UI).
  - Name and one-sentence goal
  - Files and areas likely touched
  - Acceptance criteria that can be checked (commands to run, behavior to observe)
  - Depends on which earlier tasks

Then **stop and ask the user to approve the plan**. Do not start building until they do.

## Step 3: Write task briefs

After approval, for each task create `docs/project/tasks/NN-<name>.md`. A brief must be self-contained, because the chat or sub-agent that executes it will not have this conversation:

- The goal and the acceptance criteria
- A "Read first" list: `docs/project/STATE.md`, the plan file, and the specific code files
- Constraints that matter for this task (rules to respect, patterns to copy from existing code, what not to touch)
- Security and performance notes specific to this task
- What to report when done: files changed, commands run with real results, anything left unresolved

Do not run tasks in parallel if they touch the same files or the same database tables.

## Step 4: Execute and review, one task at a time

The planning chat ends once the briefs are written. Each brief is then built in its own fresh chat (one task per chat), which follows `.cursor/rules/orchestration.mdc` and may delegate focused work to subagents with the brief's path and a self-contained prompt. Never run two tasks in parallel if they touch the same files or tables. When a task is done, the build chat does the following (the user can also open a separate fresh chat to review the diff against the plan):

1. Review the actual diff against the brief and the plan, not just the executor's summary.
2. Run the type check, lint, and tests, and report the real output.
3. Check the security and performance notes from the brief were respected.
4. Update `docs/project/STATE.md` if the project changed in a way a future chat needs to know.
5. Mark the task done in the plan file, and say what the next task is.

If a task reveals the plan was wrong, update the plan and tell the user before continuing.

## Step 5: Finish

- Do a final integration check: full type check, lint, tests, and a production build.
- If the feature touched authentication, permissions, file uploads, payments, or the database schema, recommend running `@security-audit` before release.
- Summarize what shipped, what was deferred, and any follow-ups, and make sure `STATE.md` reflects the final state.

## Rules for yourself

- Never report a task as done without evidence from commands you ran.
- Do not hide uncertainty. If you are unsure about something, say so and list it as an open question in the plan.
- Do not expand scope silently. New ideas go in the plan as proposed additions for the user to approve.
- Keep plans and briefs short and concrete. Long plans are rarely read and quickly go stale.
