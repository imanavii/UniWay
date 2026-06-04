# Contributing to UniWay

## Branch naming

```
<your-name>/<short-description>
```

Examples: `aetos/add-auth`, `sarah/fix-marker-bug`

## PR titles

Use conventional commits:

| Type     | When                          |
| -------- | ----------------------------- |
| `feat`   | New feature                   |
| `fix`    | Bug fix                       |
| `chore`  | Tooling, dependencies         |
| `refactor` | Code change, no behavior change |
| `docs`   | Documentation only            |
| `style`  | Formatting, styling           |
| `test`   | Adding or fixing tests        |

Example: `feat: add campus map markers`

## Merge policy

- **Squash merge** all PRs into `main`
- Keep branches short-lived (hours to days, not weeks)

## CI

Three checks run on every PR:

1. **Lint & Typecheck** — `next lint` + `tsc --noEmit`
2. **Tests & Coverage** — `vitest run --coverage` (must meet thresholds)
3. **Build** — `next build` (must compile)

All three must pass before merge.

## Tests

- Tests are co-located next to source files (`page.tsx` → `page.test.tsx`)
- Coverage thresholds: 80% lines, 80% functions, 80% statements, 70% branches
- Write tests before or alongside implementation
