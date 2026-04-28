# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Toolchain

- Node 24.14.1 / pnpm 10.33.0 are pinned via `mise.toml`. Use `pnpm`, not `npm` or `yarn`
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (24 h). Newly-released package versions are blocked—pick the previous patch when an install fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`
- TypeScript runs with `strict` + `exactOptionalPropertyTypes` + `noUncheckedSideEffectImports` + `verbatimModuleSyntax`. Optional properties must be omitted (use spread guards like `...(value ? { key: value } : {})`) rather than set to `undefined`
- Imports use the `@/*` alias for `src/*`; configured in `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`

## Commands

```sh
pnpm dev            # Vite dev server
pnpm build          # tsc -b && vite build
pnpm preview        # serve dist on :4173 (used by Playwright webServer)
pnpm test           # vitest run (single pass)
pnpm test:watch     # vitest watch
pnpm test:e2e       # Playwright; auto-runs `pnpm preview`
pnpm lint           # oxlint
pnpm lint:fix       # oxlint --fix
```

Run a single Vitest file with `pnpm test src/pair/queue.test.ts`. Run a single Playwright spec with `pnpm exec playwright test e2e/smoke.spec.ts -g "tab name"`. Playwright Chromium must be present (`pnpm exec playwright install chromium`).

There is no separate format command. Formatting is delegated to the `oxc.oxc-vscode` editor extension (see `.vscode/settings.json`)—oxc has no published standalone CLI formatter at this time.

## Architecture

The codebase is a single-page React app driven by four orthogonal layers. Understanding how data flows between them is essential before changing any layer.

### Data flow (rx)

```
SerialPort (Web Serial API)
  → serial/serial-manager.ts        // open/close, AbortSignal-based reader cancel
  → serial/line-stream.ts           // CR/LF stitching across chunks
  → serial-manager.onLine listeners
  → store/pipeline.ts               // single subscriber that fans out
      → store/log-store.ts          // every line, regardless of validity
      → nmea/parser.ts              // checksum verify + kind dispatch
          ├── kind: "nmea"  → store/nmea-store.ts (with nmea/aggregator.ts for GSV)
          ├── kind: "pair-ack" → pair/queue.ts → resolves PAIR send Promise
          └── kind: "pair"  → pair/queue.ts (follow-up sentence collection)
```

`store/pipeline.ts` is the only place that wires serial lines into stores. Adding a new sentence type means adding a decoder in `nmea/parser.ts`, an ingest function in `nmea-store.ts`, and a switch case in `pipeline.ts`—no other files need to know.

### PAIR command semantics (`src/pair/queue.ts`)

The queue is **strictly FIFO with one in-flight command** because GR-M02U's responses to multiple in-flight commands cannot be reliably correlated. Key invariants:

- A `Get*` command (e.g. PAIR051) returns both `$PAIR001,051,0` (ack) and `$PAIR051,3000` (follow-up). The queue resolves only after both arrive—in either order—when `expectFollowUpCid` is set on the entry
- `result=1` (processing) is not a terminal state; the ack timer is rearmed up to `maxProcessingExtensions` times before timing out
- Results 2/3/4/5 each map to a distinct `PairErrorKind`. UI code differentiates them via `err instanceof PairError && err.kind === "..."`
- `pipeline.ts` calls `pairQueue.cancelAll()` on disconnect/error to reject everything in flight

Adding a new representative command means adding an entry to `pair/catalog.ts` with the right `resultKind` and `followUpCid`. Set/Get pairs in the catalog are how `SettingsView` knows which Getter to refresh after a Setter succeeds.

### Stores (Zustand)

All four stores use `subscribeWithSelector`. NMEA arrives at 1–10 Hz, so the ingest functions in `nmea-store.ts` perform shallow equality checks via `shallowDiff` and reuse the prior reference when nothing changed—components selecting individual slices (`useNmeaStore(s => s.position)`) do not re-render unnecessarily. Preserve this pattern when adding new fields.

`log-store.ts` is a ring buffer (`capacity` 5000). Pushes that overflow `splice(0, len-cap)` in place; do not switch to `Array.shift()` per line—it would O(n²) under 10 Hz GSV bursts.

### UI conventions

- shadcn/ui (new-york style) generated into `src/components/ui/`. The shadcn CLI `pnpm exec shadcn add ...` writes to `@/components/ui/` literally (not the alias)—after running it, move files from `./@/components/ui/` to `src/components/ui/` and delete the stray `@` directory
- The `cn` utility lives at `@/lib/cn` (not the shadcn default `@/lib/utils`); `components.json` is configured accordingly
- The shadcn `sonner` template imports its own type from itself and uses `next-themes`; the in-repo copy fixes both. If you re-add `sonner` via the CLI, expect to apply the same edits
- Inline styles are reserved for dynamically-computed values (e.g. virtual list `transform`, SNR bar `height: ${pct}%`). Layout/styling otherwise goes through Tailwind classes and shadcn primitives

## Manual reference

The full device manual is `docs/GR-M02Manual.md` (extracted from the bundled PDF). When implementing a new PAIR command, cite the section there to confirm argument ranges, response shape, and which sentences are returned.

## Tests

- Vitest covers checksum, NMEA parser/aggregator, line splitter, serial-manager lifecycle, PAIR encode/queue, and store ingest. The PAIR queue suite uses `vi.useFakeTimers()`; when adding rejection cases, attach a `.catch(() => {})` to the pending promise before advancing timers, otherwise Vitest reports an unhandled rejection even if the test asserts the rejection later
- Test fixtures should be built via `attachChecksum(body)` rather than hand-written `*XX` checksums—hand-written values silently mask parser bugs
- Playwright uses `webServer: pnpm preview`. After UI changes, run `pnpm build` before `pnpm test:e2e` so the preview serves the latest bundle

## Real-device handling

Sending PAIR commands to the physical GR-M02U has side effects (reboot, NVRAM rewrite, baud-rate switch). **Never send PAIR commands during automated tests.** Use the mock at `src/test/mocks/mock-serial-port.ts` and the in-browser fake serial pattern for E2E.

After `PAIR864` (set baud rate) succeeds, the device immediately starts speaking the new rate. The app intentionally does not auto-switch the host-side baud—it surfaces a toast prompting manual reconnect via the connection bar. Do not change this behaviour without re-evaluating the recovery path when the host-side switch fails.
