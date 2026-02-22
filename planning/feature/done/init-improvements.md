# Enhanced Help Text + `transcribe init` Command

## Context

The CLI help doesn't show available model or format values clearly. When models are missing, the user gets a raw error instead of a guided setup experience. We're adding: (1) dynamic help text that lists installed models and all formats, and (2) a `transcribe init` subcommand that checks dependencies and downloads models interactively with a progress bar.

## New Dependencies

- `cli-progress` + `@types/cli-progress` — progress bar for model downloads

## Files to Modify

| File           | Change                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/types.ts` | Add `VALID_FORMATS` array and `FORMAT_DESCRIPTIONS` map                                                                                                |
| `src/cli.ts`   | Add `addHelpText` callback, register `init` subcommand, use shared `VALID_FORMATS` for validation, update `--model` and `--format` option descriptions |

## New Files

| File                 | Purpose                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models.ts`      | Model catalog (`AVAILABLE_MODELS`), `MODELS_DIR`, `getInstalledModels()` (sync, for help text), `formatFileSize()`, `getModelDownloadUrl()` |
| `src/init.ts`        | `runInit()` — dependency check, interactive model selection (readline/promises), download with cli-progress bar                             |
| `src/models.test.ts` | Unit tests for `formatFileSize`, `getInstalledModels` with temp dirs                                                                        |

## Implementation Steps

### Step 1: Install cli-progress

```bash
npm install cli-progress && npm install -D @types/cli-progress
```

### Step 2: Create `src/models.ts`

- `MODELS_DIR` = `~/.whisper-models`
- `AVAILABLE_MODELS` array with name, filename, sizeDescription, description for: tiny, base, small, medium, large-v3, large-v3-turbo
- `getInstalledModels()` — sync `readdirSync`/`statSync` scan of MODELS_DIR for `ggml-*.bin`, returns `{ name, sizeBytes }[]`
- `formatFileSize(bytes)` — human-readable (MB/GB)
- `getModelDownloadUrl(filename)` — HuggingFace URL

### Step 3: Add shared constants to `src/types.ts`

```ts
export const VALID_FORMATS: OutputFormat[] = [
  'markdown',
  'vtt',
  'podcast-json',
  'srt',
  'word-json',
];

export const FORMAT_DESCRIPTIONS: Record<OutputFormat, string> = {
  markdown: 'Merged paragraphs with optional metadata',
  vtt: 'WebVTT with timestamps',
  'podcast-json': 'Podcasting 2.0 transcript JSON',
  srt: 'SubRip subtitle format',
  'word-json': 'Word-level timestamps JSON',
};
```

### Step 4: Update `src/cli.ts`

- Change `--model` help to `'Model name (see available models below)'`
- Change `--format` help to `'Output format (see formats below)'`
- Replace inline `validFormats` array with imported `VALID_FORMATS`
- Add `program.addHelpText('after', () => ...)` that:
  - Lists installed models from `getInstalledModels()` with sizes, or "(none — run transcribe init)" if empty
  - Lists all formats from `VALID_FORMATS` with descriptions
- Register `init` subcommand: `program.command('init').description('Check dependencies and download whisper models').action(runInit)`

Expected help output:

```
Usage: transcribe [options] <input>
...
Commands:
  init                     Check dependencies and download whisper models

Available models (in ~/.whisper-models/):
  base                     141 MB
  large-v3-turbo           1.5 GB  (default)

Output formats:
  markdown                 Merged paragraphs with optional metadata (default)
  vtt                      WebVTT with timestamps
  podcast-json             Podcasting 2.0 transcript JSON
  srt                      SubRip subtitle format
  word-json                Word-level timestamps JSON
```

### Step 5: Create `src/init.ts`

`runInit()` orchestrates three steps:

**1. Check dependencies** — calls existing `checkWhisperCli()` and `checkFfmpeg()` from validate.ts, prints status for each, exits if missing

**2. Select models** — shows numbered list of available models (marks already-installed ones), prompts user via `readline/promises` for comma-separated numbers or "all"

**3. Download models** — for each selected model:

- `fetch()` from HuggingFace URL (Node built-in, follows redirects)
- Stream response body to file via `createWriteStream`
- `cli-progress.SingleBar` with homebrew-style format: `[####--------] 65% | 1.0 GB/1.5 GB | ETA: 00:32`
- Clean up partial file on error

### Step 6: Write tests

`src/models.test.ts`:

- `formatFileSize` — bytes, MB, GB boundaries
- `getInstalledModels` — with temp dir containing fake .bin files, empty dir
- `getModelDownloadUrl` — correct URL pattern

### Step 7: Update README.md

- Update `checkModel` error message in validate.ts to mention `transcribe init`
- Update README installation section to mention `transcribe init` as alternative to manual download

## Verification

1. `npx tsc --noEmit` — clean type-check
2. `npx vitest run` — all tests pass
3. `transcribe --help` — shows models and formats
4. `transcribe init` — interactive flow works
