# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where to look first

Settings and conventions live in their canonical config files. Read those rather than relying on a copy here.

| Topic                                                              | Source of truth                      |
| ------------------------------------------------------------------ | ------------------------------------ |
| Project overview, user-facing features                             | `README.md`                          |
| Toolchain versions (Node, pnpm)                                    | `mise.toml`                          |
| Scripts (`dev` / `build` / `test` / `test:e2e` …) and dependencies | `package.json`                       |
| TypeScript strictness flags and `@/*` alias                        | `tsconfig.app.json`                  |
| Path-alias plumbing for tooling                                    | `vite.config.ts`, `vitest.config.ts` |
| pnpm workspace policies (release embargo, allowBuilds)             | `pnpm-workspace.yaml`                |
| shadcn/ui style + `cn` import path                                 | `components.json`                    |
| Lint rules                                                         | `.oxlintrc.json`                     |
| hk steps and hooks (pre-commit / check / fix)                      | `hk.pkl`                             |
| Playwright config (`webServer`, base URL)                          | `playwright.config.ts`               |
| Device manual (PAIR command spec)                                  | `docs/GR-M02Manual.md`               |

Use `pnpm` exclusively — never `npm` / `yarn`. Lint (`oxlint`), format (`oxfmt`), and `vitest` are orchestrated by `hk` (`hk.pkl`) — run `hk fix` to auto-fix or `hk check` to verify. `oxfmt` also runs on save through the `oxc.oxc-vscode` editor extension (see `.vscode/settings.json`). CI runs `hk check --all` (then `pnpm build` + `pnpm test:e2e` separately) and fails on any diff.

Run a single Vitest file: `pnpm test src/pair/queue.test.ts`. Run a single Playwright spec: `pnpm exec playwright test e2e/smoke.spec.ts -g "tab name"` (Chromium must be installed via `pnpm exec playwright install chromium`).

## Non-obvious gotchas

- **`ERR_PNPM_NO_MATURE_MATCHING_VERSION` on install** — caused by the 24 h embargo in `pnpm-workspace.yaml`. Pick the previous patch version.
- **`exactOptionalPropertyTypes`** — optional properties must be omitted, not set to `undefined`. Use spread guards: `...(value ? { key: value } : {})`.
- **shadcn CLI writes to a literal `@` directory.** `pnpm exec shadcn add ...` creates `./@/components/ui/` (the `@` is taken literally, not resolved to the alias). Move files into `src/components/ui/` and delete the stray `@` directory.
- **The shadcn `sonner` template** imports its own type from itself and pulls in `next-themes`; the in-repo copy patches both. Re-running the CLI requires re-applying the patches.
- **Inline styles** are reserved for dynamically-computed values (virtual list `transform`, SNR bar `height: ${pct}%`). Otherwise go through Tailwind classes and shadcn primitives.

## Architecture

Single-page React app with four orthogonal layers. Read each entry point before changing the layer.

### Data flow

```
Web Serial API
  → src/serial/serial-manager.ts   // open/close, line stitching, AbortSignal reader cancel
  → src/store/pipeline.ts          // single subscriber that fans lines out to stores
      → src/store/log-store.ts     // every line, regardless of validity
      → src/nmea/parser.ts         // checksum verify + kind dispatch
          → src/store/nmea-store.ts (+ src/nmea/aggregator.ts for GSV)
          → src/pair/queue.ts      (ack + follow-up sentences)
```

`store/pipeline.ts` is the only place that wires serial lines into stores. To add a new sentence type: decoder in `nmea/parser.ts`, ingest in `nmea-store.ts`, switch case in `pipeline.ts` — nothing else needs changing.

### PAIR queue (`src/pair/queue.ts`)

The queue is **strictly FIFO with one in-flight command**, because GR-M02U's responses cannot be reliably correlated when multiple commands are in flight. The remaining invariants (ack + follow-up resolution, `result=1` rearm semantics, `PairErrorKind` mapping, `cancelAll` on disconnect) are implemented in `queue.ts` and exercised by `queue.test.ts` — read those.

`src/pair/catalog.ts` holds Set/Get pairings; `SettingsView` uses them to refresh the Getter after a Setter succeeds. Adding a new representative command means a catalog entry with the right `resultKind` and `followUpCid` — always cite the matching section of `docs/GR-M02Manual.md` to confirm argument ranges and response shape.

### Stores (Zustand)

All four stores in `src/store/` use `subscribeWithSelector`. Two performance-sensitive patterns must be preserved:

- `nmea-store.ts` ingest functions use `shallowDiff` to reuse the prior reference when nothing changed. NMEA arrives at 1–10 Hz; without this, every selector would re-render. Keep this pattern when adding fields.
- `log-store.ts` is a ring buffer (`capacity` 5000) that overflows via in-place `splice(0, len-cap)`. Do **not** switch to `Array.shift()` per line — it goes O(n²) under 10 Hz GSV bursts.

## Tests

- The PAIR queue suite uses `vi.useFakeTimers()`. When adding a rejection case, attach `.catch(() => {})` to the pending promise before advancing timers, otherwise Vitest reports an unhandled rejection even if the test asserts it later.
- Build NMEA test fixtures with `attachChecksum(body)`. Hand-written `*XX` checksums silently mask parser bugs.
- After UI changes, run `pnpm build` before `pnpm test:e2e` so the Playwright `preview` server serves the latest bundle.

## Real-device handling

Sending PAIR commands to the physical GR-M02U has side effects (reboot, NVRAM rewrite, baud-rate switch). **Never send PAIR commands during automated tests.** Use `src/test/mocks/mock-serial-port.ts` and the in-browser fake serial pattern for E2E.

After `PAIR864` (set baud rate) succeeds, the device immediately starts speaking the new rate. The app intentionally does **not** auto-switch the host-side baud — it surfaces a toast prompting manual reconnect via the connection bar. Do not change this behaviour without re-evaluating the recovery path when the host-side switch fails.
