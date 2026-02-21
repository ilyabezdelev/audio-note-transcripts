# Code Review — 2026-02-21

Reviewed all source files in `src/`. Overall the code works and is reasonably organized, but there are real bugs, structural issues, and accumulated Sonnet-isms worth fixing.

## Bugs

### 1. `mergeSegments` can produce duplicate text (markdown.ts:99-117)

When the loop hits `minLines` at segment `i`, it starts a new group from `segments[i+1]` and does `i++` to skip it. But the outer `for` loop also increments `i`. So the segment at `i+1` gets added to the new group's `texts` array AND becomes the starting point — but then `i` advances to `i+2`, skipping `i+1` in the next iteration.

Wait — actually looking more carefully: it adds `segments[i+1]` as the first element of the new group, then does `i++` so the for-loop's `i++` brings us to `i+2`. So `segments[i+1]` is NOT processed again by the loop. This is correct but fragile — the double-increment pattern is easy to break and hard to reason about.

**Verdict**: Not a bug, but should be rewritten for clarity. A `while` loop with explicit index management would be clearer.

### 2. WAV duration is always 0 (transcribe.ts:117-123)

```ts
if (inputExt === '.wav') {
  wavPath = inputPath;
  // For WAV files, we'd need to calculate duration separately
  // For now, leave as 0 (can be improved later)
}
```

If someone passes a `.wav` file, the metadata `duration` field is `0`. The comment says "can be improved later" — it's been months. ffprobe or reading the WAV header would fix this.

### 3. `format` parameter passed to `whisper.ts` but never used (whisper.ts:19)

```ts
export async function transcribe(
  wavPath: string,
  modelPath: string,
  format: OutputFormat, // ← never used
```

The function always passes `--output-vtt` regardless of format. The parameter exists but is dead code. Should be removed or actually used.

### 4. Tilde expansion duplicated and inconsistent

Three different tilde expansions:

- `cli.ts:10` — `homedir()` from `os`
- `whisper.ts:25` — `process.env.HOME || '~'` (falls back to literal `~` if HOME unset — broken)
- `validate.ts:43` — `homedir()` from `os`

The `whisper.ts` version is wrong. If `HOME` is unset, `'~'.replace(/^~/, '~')` returns `'~'` — a relative path that won't resolve to anything useful.

### 5. `rename` imported dynamically twice (transcribe.ts:184, 228)

```ts
const { rename } = await import('fs/promises');
```

This appears twice in the same function. `rename` is already available from the static import at the top of the file (`import { access, mkdir, unlink } from 'fs/promises'`). Just add `rename` to that import.

## Structural Issues

### 6. Duplicated utility functions

`formatDuration`, `formatDate`, and `getLanguageName` are copy-pasted identically in both `markdown.ts` and `vtt.ts`. Any fix to one must be manually applied to the other.

**Fix**: Extract to a shared `src/format-utils.ts` and import from both modules.

### 7. `inputPath` passed twice to `transcribeAudio`

```ts
await transcribeAudio(inputPath, {
  inputPath: inputPath, // redundant
  outputPath: outputPath,
  // ...
});
```

`inputPath` is both the first argument and a field in the config object. The function signature takes `(inputPath, config)` but `config` also has `inputPath`. The function uses the first argument, not `config.inputPath`. The config field is dead.

**Fix**: Remove `inputPath` from `TranscriptionConfig` or remove the first argument.

### 8. No separation between library and CLI

`transcribe.ts` mixes business logic with `console.log` statements. There are 15+ console.log calls scattered through the pipeline function. This makes the module unusable as a library — anyone importing `transcribeAudio` gets console spam.

**Fix**: Accept an optional logger/callback, or return structured progress events, or at minimum gate all logging behind a `verbose` flag (not just whisper output).

### 9. Manual test files in `src/`

Four `test-*.ts` files live alongside production code in `src/` and get compiled to `dist/`. They should either be proper automated tests (see tests.md plan) or moved out of the source tree.

### 10. `nanoid` dependency for a 6-char random string

`nanoid` + `nanoid-dictionary` are two dependencies for generating a 6-character alphanumeric ID. `crypto.randomUUID().slice(0, 6)` or `crypto.randomBytes(4).toString('hex').slice(0, 6)` would work with zero dependencies.

Not a strong objection — nanoid is fine — but it's worth noting for a project that values minimal dependencies.

## Code Smells

### 11. `any` type on caught errors

```ts
} catch (error: any) {
  if (error.code === 'ENOENT') {
```

Used in `transcribe.ts:44` and `transcribe.ts:218`. TypeScript's `unknown` catch type is better:

```ts
} catch (error) {
  if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
```

Or use a type guard utility.

### 12. Promise constructor anti-pattern in `whisper.ts` and `ffmpeg.ts`

Both files wrap `spawn` in `new Promise()`. This works but is the classic Node.js anti-pattern where the promise executor contains complex async logic. A cleaner approach would be to use `child_process.execFile` with `promisify`, or use a helper that wraps spawn with proper stream handling.

Not a high-priority fix — it works — but worth noting.

### 13. No `.nvmrc` or `engines` field

No indication of required Node.js version. The code uses top-level `await` (in test files), ESM, and `fs/promises` — requires Node 18+. Should be documented.

**Fix**: Add `"engines": { "node": ">=18" }` to package.json.

### 14. `constants.R_OK` for file existence check

`validate.ts` uses `access(path, constants.R_OK)` to check if files exist. This is correct but `access()` is explicitly documented as unsuitable for access checks before file operations (TOCTOU race). Since this is just a user-friendly pre-flight check (not a security gate), it's fine — but the code should not rely on it for correctness.

### 15. Output path handling is complex and duplicated

`transcribe.ts` lines 179-232 have two nearly-identical branches for moving output files (custom path vs. default path). Both do `mkdir` + `rename`. The only difference is how the final path is computed.

**Fix**: Compute `finalOutputPath` first, then have a single `mkdir` + `rename` call.

## Low Priority / Nits

### 16. Hardcoded language list

11 languages hardcoded in two places. whisper.cpp supports 100+ languages. The list will be wrong for anyone using an unsupported language code — they'll see the raw code instead of a name, which is actually fine behavior. But the list gives a false sense of completeness.

**Fix**: Either expand to all whisper-supported languages or remove the mapping and just display codes.

### 17. Error message formatting inconsistency

Some errors use `✗` prefix (cli.ts), some use plain text (validate.ts), some use `Warning:` (transcribe.ts). Minor, but noticeable.

### 18. Version hardcoded as string in CLI

```ts
.version('0.1.0')
```

Should read from `package.json` to stay in sync. Can use `createRequire` or a build-time replacement.

## Summary by Priority

| Priority         | Issue                                    | Effort                       |
| ---------------- | ---------------------------------------- | ---------------------------- |
| **Fix now**      | #2 WAV duration always 0                 | Small                        |
| **Fix now**      | #4 Broken tilde expansion in whisper.ts  | Tiny                         |
| **Fix now**      | #5 Dynamic import of rename              | Tiny                         |
| **Fix now**      | #3 Dead `format` parameter in whisper.ts | Tiny                         |
| **Should fix**   | #6 Duplicated utility functions          | Small                        |
| **Should fix**   | #7 inputPath passed twice                | Small                        |
| **Should fix**   | #8 Console.log in library code           | Medium                       |
| **Should fix**   | #9 Test files in src/                    | Small (blocked on test plan) |
| **Should fix**   | #15 Output path handling duplication     | Small                        |
| **Nice to have** | #11 `any` catch types                    | Tiny                         |
| **Nice to have** | #13 No engines field                     | Tiny                         |
| **Nice to have** | #1 Fragile mergeSegments loop            | Small                        |
| **Nice to have** | #18 Version hardcoded                    | Tiny                         |
| **Won't fix**    | #10 nanoid dependency                    | —                            |
| **Won't fix**    | #12 Promise constructor pattern          | —                            |
| **Won't fix**    | #14 TOCTOU in access checks              | —                            |
| **Won't fix**    | #16 Hardcoded language list              | —                            |
