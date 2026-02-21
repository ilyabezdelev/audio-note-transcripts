# Test Coverage Plan

## Current State

No test framework. Four manual test scripts (`test-ffmpeg.ts`, `test-whisper.ts`, `test-vtt.ts`, `test-pipeline.ts`) that require real audio files, a whisper model, and manual visual inspection of output. They're useful for manual verification but provide zero automated regression protection.

## Strategy

Two tiers of tests:

1. **Unit tests** — fast, no external dependencies, run on every change
2. **Integration tests** — require ffmpeg/whisper-cli/model files, run manually or in a specific CI environment

### Framework: Vitest

Vitest over Jest because:

- Native ESM support (this project uses `"type": "module"`)
- Native TypeScript support via tsx (already a devDependency)
- Fast, minimal config
- Compatible API if we ever need to switch

## Unit Tests (Tier 1)

These test pure logic with no filesystem or process spawning. Use fixture strings, not real files.

### `markdown.test.ts`

The richest target for unit tests. All functions are pure-ish (read string in, produce string out).

| Test                                      | What it covers                                       |
| ----------------------------------------- | ---------------------------------------------------- |
| `parseVttFile` — standard VTT             | Parses multi-segment VTT into `{timestamp, text}[]`  |
| `parseVttFile` — empty file               | Returns `[]` for `"WEBVTT\n\n"`                      |
| `parseVttFile` — single segment           | Handles 1-segment VTT                                |
| `parseVttFile` — multi-line cue text      | Joins lines within a single cue                      |
| `parseVttFile` — VTT with NOTE section    | Skips metadata NOTE blocks                           |
| `mergeSegments` — empty                   | Returns `[]`                                         |
| `mergeSegments` — 1 segment               | Returns it as-is                                     |
| `mergeSegments` — exactly minLines        | Groups correctly at boundary                         |
| `mergeSegments` — 2 segments (< minLines) | Merges into one                                      |
| `mergeSegments` — 7 segments, minLines=3  | Produces correct grouping (3, 3, 1) or (3, 4)        |
| `mergeSegments` — minLines=1              | Each segment stays separate                          |
| `formatDuration`                          | `0` → `"00:00:00"`, `3661` → `"01:01:01"`            |
| `formatDate`                              | Correct `YYYY-MM-DD HH:MM:SS` output                 |
| `getLanguageName`                         | Known codes return names, unknown codes pass through |
| `convertToMarkdown` — full output         | Snapshot test of complete markdown with metadata     |
| `convertToMarkdown` — suppressMetadata    | Only text paragraphs, no headers/timestamps          |

**Prerequisite**: Export `parseVttFile`, `mergeSegments`, `formatDuration`, `formatDate`, `getLanguageName` from `markdown.ts` (currently all private). Two options:

- **Option A**: Export them directly (simplest)
- **Option B**: Move to a separate `parsers.ts` / `formatters.ts` and export from there

Recommend **Option A** — just export them. They're stable utility functions.

### `vtt.test.ts`

| Test                            | What it covers                                            |
| ------------------------------- | --------------------------------------------------------- |
| `addMetadata` — valid VTT       | Injects NOTE section after WEBVTT header                  |
| `addMetadata` — invalid VTT     | Throws on non-VTT content                                 |
| `formatDuration` / `formatDate` | Same as markdown (these are duplicated — see code review) |

These need `readFile`/`writeFile` mocked, or use `memfs`, or use temp files. Recommend temp files via `os.tmpdir()` — simple and real.

### `validate.test.ts`

| Test                                | What it covers                                            |
| ----------------------------------- | --------------------------------------------------------- |
| `validateInputFile` — existing file | Resolves without error                                    |
| `validateInputFile` — missing file  | Throws with readable message                              |
| `checkModel` — missing model        | Throws with install instructions                          |
| `checkWhisperCli` / `checkFfmpeg`   | Mock `exec` — verify error message when command not found |

### `cli.test.ts`

| Test              | What it covers                                    |
| ----------------- | ------------------------------------------------- |
| `expandTilde`     | `~/foo` → `/Users/.../foo`, `/abs/path` unchanged |
| Format validation | Rejects invalid format strings                    |

`expandTilde` is currently private to `cli.ts`. Export it or inline a test-only import.

## Integration Tests (Tier 2)

These require real binaries and files. Gate them behind an environment variable (`RUN_INTEGRATION=1`) or a separate vitest config/workspace.

### `ffmpeg.integration.test.ts`

| Test               | What it covers                                 |
| ------------------ | ---------------------------------------------- |
| Convert M4A to WAV | Output file exists, is valid WAV, duration > 0 |
| Convert OGG to WAV | Same checks                                    |
| Invalid input file | Rejects with ffmpeg error                      |

Requires: `ffmpeg` in PATH, a small test audio file (~2-3 seconds) committed to `test/fixtures/`.

### `whisper.integration.test.ts`

| Test                 | What it covers                             |
| -------------------- | ------------------------------------------ |
| Transcribe short WAV | Produces VTT file, VTT has valid structure |
| Language parameter   | VTT content is in expected language        |

Requires: `whisper-cli` in PATH, `ggml-base.bin` model, test WAV file.

### `pipeline.integration.test.ts` (end-to-end)

| Test                    | What it covers                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| Full M4A → markdown     | Output file exists, has metadata section, has transcription section |
| Full M4A → VTT          | Output has NOTE section with metadata                               |
| Output path collision   | Second run generates unique filename                                |
| Custom output directory | File lands in specified dir                                         |
| `--suppress-metadata`   | Markdown has no metadata section                                    |

## Test Fixtures

Create `test/fixtures/` with:

- `short.wav` — 2-3 second recording of speech (committed to repo, ~100KB at 16kHz mono)
- `sample.vtt` — valid VTT content as a text fixture
- `empty.vtt` — `"WEBVTT\n\n"` only
- `malformed.vtt` — for error path testing

For unit tests, most VTT content should be inline strings in the test files, not fixture files.

## Setup

### Dependencies to add

```bash
npm install -D vitest
```

### Config

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
});
```

Separate integration config or use `vitest --config vitest.integration.config.ts`.

### package.json scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest run --config vitest.integration.config.ts"
}
```

## Execution Plan

### Phase 1: Setup + markdown unit tests

1. `npm install -D vitest`
2. Create `vitest.config.ts`
3. Export private functions from `markdown.ts`
4. Write `src/markdown.test.ts` — all `parseVttFile` and `mergeSegments` tests
5. Add `test` / `test:watch` scripts to `package.json`

### Phase 2: Remaining unit tests

6. Write `src/vtt.test.ts` (using temp files)
7. Write `src/validate.test.ts` (mock exec for binary checks)
8. Write `src/cli.test.ts` (expandTilde)

### Phase 3: Integration tests

9. Create `test/fixtures/short.wav`
10. Write `src/ffmpeg.integration.test.ts`
11. Write `src/whisper.integration.test.ts`
12. Write `src/pipeline.integration.test.ts`
13. Add `test:integration` script

### Phase 4: Cleanup

14. Remove old manual `test-*.ts` files from `src/`
15. Update `.gitignore` if needed (coverage reports)
16. Add `test:coverage` script (`vitest run --coverage`)

## What NOT to Test

- whisper.cpp output quality (that's their problem)
- ffmpeg conversion fidelity (same)
- Exact whisper-cli CLI flags (brittle, changes with whisper-cpp versions)
- Console.log output formatting (not worth the maintenance)
