# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### ПОСЛЕДНЕЕ ДЕЛО (artifacts/last-job)
- **Type**: react-vite (static, no backend)
- **Preview path**: `/`
- **Stack**: React + Vite + TypeScript + Canvas 2D
- **Description**: 5-phase heist game with narrative depth, moral choices, and multiple endings
- **Architecture**:
  - `src/game/Game.tsx` — Main React component, manages all screens and state
  - `src/game/phaseEngines.ts` — All 5 phase game engines (canvas rendering + game logic)
  - `src/game/narrative.ts` — Story, choices, interludes, endings, monologues
  - `src/game/types.ts` — TypeScript interfaces
- **Screens**: intro → backstory → interlude → (playing + choice) × 5 → ending
- **Ending system**: 3 endings (ЧИСТО / ПРАВДА / ПРИЗРАК) based on morality score and key choices
- **No backend needed**: Pure static HTML/JS, GitHub Pages compatible
