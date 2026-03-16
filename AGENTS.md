# Agent Workflow

This document tells autonomous Claude instances how to pick up and implement tasks.

## Picking a Task

> If a specific task file was provided at invocation, skip this section and go straight to that file.

1. List files in `tasks/open/` — sorted by ID (lowest first), then by priority (`high` > `medium` > `low`)
2. Pick the highest-priority, lowest-ID task
3. Move the task file to `tasks/in-progress/` before starting work
4. Read the task file fully before writing any code

## Implementing a Task

### Screenshots (if `evidence: screenshot` in front matter)

Take a **before** screenshot first, before changing any code:

```bash
node scripts/screenshot.js --url "$APP_URL" --out screenshots/<task-id>-before.png
```

Implement all `[AGENT]` steps. Run the test suite:

```bash
npm test
```

Take an **after** screenshot using the Vercel preview URL (push your branch first and wait for the preview deployment, then use the URL Vercel posts to the GitHub PR):

```bash
node scripts/screenshot.js --url "<vercel-preview-url>" --out screenshots/<task-id>-after.png
```

Commit the screenshots alongside your changes.

### Email Template Screenshots (if task modifies `lib/emails.js`)

Run the preview script to render templates to HTML files:

```bash
npm run preview-emails
```

Then screenshot each affected preview file:

```bash
node scripts/screenshot.js --url "file://$(pwd)/email-previews/<template>-before.html" --out screenshots/<task-id>-email-before.png
node scripts/screenshot.js --url "file://$(pwd)/email-previews/<template>-after.html" --out screenshots/<task-id>-email-after.png
```

### No Screenshots

Implement all `[AGENT]` steps, then run:

```bash
npm test
```

## Opening a PR

- If the task has **no `[HUMAN]` steps**: open a ready-for-review PR
- If the task has **any `[HUMAN]` steps**: open a **draft PR**

PR description must include:
1. A link to the task file (e.g. `tasks/in-progress/001-add-playwright.md`)
2. A summary of what was implemented
3. If draft: a `## Human Steps` checklist copied from the task, with clear instructions for the reviewer
4. If screenshots: embed before/after images inline using absolute `raw.githubusercontent.com` URLs — relative paths do not render on GitHub. Format:
   ```
   ![label](https://raw.githubusercontent.com/jelinson/big-g-finder/<branch>/screenshots/<filename>.png)
   ```

## Closing a Task

Move the task file from `tasks/in-progress/` to `tasks/done/` and fill in the `pr` field with
the PR URL, then commit that change as part of the same feature branch. This means the move to
`done/` lands on main only when the PR is merged — branch protection is not an issue.

## Notes

- Always work on a feature branch — never commit directly to `main`
- Do not implement `[HUMAN]` steps — document them in the PR and stop
- Do not open a PR if tests are failing
- Do not modify other open tasks
- Human review before merge is enforced by GitHub branch protection, not this workflow
