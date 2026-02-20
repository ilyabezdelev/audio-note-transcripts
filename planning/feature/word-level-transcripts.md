# Word-Level Transcripts

## Goal

Output a JSON transcript with one word per segment, including precise start/end timestamps for each word. This enables word-level highlighting, karaoke-style playback, precise search, and fine-grained editing.

## Output Format

```json
{
  "version": "1.0.0",
  "duration": 97.17,
  "language": "en",
  "words": [
    {
      "word": "Hello",
      "start": 0.72,
      "end": 1.04,
      "probability": 0.95
    },
    {
      "word": "and",
      "start": 1.04,
      "end": 1.18,
      "probability": 0.98
    },
    {
      "word": "welcome",
      "start": 1.18,
      "end": 1.56,
      "probability": 0.92
    }
  ]
}
```

Fields:

- `word` — single word (whitespace-trimmed)
- `start` / `end` — float seconds
- `probability` — whisper's confidence score (0-1), when available

## whisper.cpp Word-Level Timestamps

whisper.cpp supports word-level timestamps via the `--output-words` or `--max-len 1` flags. Two approaches:

### Option A: `--output-json` with word timestamps

whisper-cli supports `--output-json` which produces a JSON file with word-level data when combined with `--max-len 1` or `--word-timestamps true` (flag name depends on whisper.cpp version):

```bash
whisper-cli -m model.bin -f audio.wav --output-json --max-len 1
```

This creates `audio.wav.json` with structure:

```json
{
  "transcription": [
    {
      "timestamps": {
        "from": "00:00:00.720",
        "to": "00:00:01.040"
      },
      "offsets": {
        "from": 720,
        "to": 1040
      },
      "text": " Hello",
      "tokens": [
        {
          "text": " Hello",
          "timestamps": {
            "from": "00:00:00.720",
            "to": "00:00:01.040"
          },
          "offsets": {
            "from": 720,
            "to": 1040
          },
          "id": 2425,
          "p": 0.95
        }
      ]
    }
  ]
}
```

### Option B: `--max-len 1` with VTT output

```bash
whisper-cli -m model.bin -f audio.wav --output-vtt --max-len 1
```

Produces VTT with one-word-per-cue:

```
WEBVTT

00:00:00.720 --> 00:00:01.040
Hello

00:00:01.040 --> 00:00:01.180
and

00:00:01.180 --> 00:00:01.560
welcome
```

### Recommendation: Option A (`--output-json`)

Use `--output-json` because:

- Gives us token-level probabilities (`p` field)
- Structured data (no VTT parsing needed)
- Offsets in milliseconds (precise, no string parsing)
- Richer data for future features (token IDs, etc.)

Fallback to Option B if the user's whisper-cli version doesn't support `--output-json`.

## Implementation

### New format option

Add `word-json` to `OutputFormat`:

```ts
export type OutputFormat = 'markdown' | 'vtt' | 'podcast-json' | 'srt' | 'word-json';
```

### New types

```ts
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface WordLevelTranscript {
  version: string;
  duration: number;
  language: string;
  words: WordTimestamp[];
}
```

### Changes to `whisper.ts`

The current `transcribe()` function always passes `--output-vtt`. For word-level output, it needs to:

1. Pass `--output-json` instead of `--output-vtt`
2. Pass `--max-len 1` to force word-level segmentation
3. Return the path to the `.json` file instead of `.vtt`

Refactor `transcribe()` to accept output format and adjust flags:

```ts
export async function transcribe(
  wavPath: string,
  modelPath: string,
  format: OutputFormat,
  outputDir?: string,
  language?: string,
  suppressConsoleOutput?: boolean
): Promise<string> {
  const args = ['-m', expandedModelPath, '-f', wavPath];

  if (format === 'word-json') {
    args.push('--output-json', '--max-len', '1');
  } else {
    args.push('--output-vtt');
  }
  // ...
}
```

### New module: `src/word-json.ts`

```ts
export async function convertToWordJson(
  whisperJsonPath: string,
  outputPath: string,
  duration: number,
  language: string
): Promise<void>;
```

Reads whisper's JSON output, extracts token-level data, maps to our `WordLevelTranscript` format, writes output.

**Parsing whisper JSON:**

```ts
function parseWhisperJson(raw: WhisperJsonOutput): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  for (const segment of raw.transcription) {
    for (const token of segment.tokens) {
      const text = token.text.trim();
      if (!text) continue; // skip whitespace-only tokens
      words.push({
        word: text,
        start: token.offsets.from / 1000,
        end: token.offsets.to / 1000,
        probability: token.p,
      });
    }
  }
  return words;
}
```

### Changes to `transcribe.ts`

Add a branch in Step 5 for `word-json`:

```ts
if (config.format === 'word-json') {
  const whisperJsonPath = wavPath + '.json'; // whisper-cli creates this
  await convertToWordJson(whisperJsonPath, outputPath, audioDuration, config.language);
}
```

Temp file cleanup needs to handle `.json` intermediate files too.

### CLI changes

```
--format <type>  Output format (markdown, vtt, podcast-json, srt, word-json)
```

## Execution Plan

### Phase 1: Verify whisper-cli JSON support

1. Test `whisper-cli --output-json --max-len 1` with a sample file
2. Inspect the JSON output structure
3. Confirm token-level timestamps and probabilities are present
4. Document the exact whisper-cli version requirements

### Phase 2: Implement

5. Add `WordTimestamp` and `WordLevelTranscript` types to `types.ts`
6. Modify `whisper.ts` to support `--output-json --max-len 1` when format is `word-json`
7. Create `src/word-json.ts` with parsing and conversion logic
8. Wire into `transcribe.ts` pipeline
9. Update CLI format validation and help text

### Phase 3: Test

10. Unit tests for `parseWhisperJson` with fixture data
11. Integration test with real audio
12. Edge cases: empty audio, single word, very long audio

## Edge Cases

- **Punctuation tokens**: whisper sometimes emits punctuation as separate tokens (e.g., `","`, `"."`). These should either be merged into the preceding word or included as standalone entries. Recommend: merge trailing punctuation into the preceding word.
- **Whisper hallucinations**: Low-probability tokens at the end of audio. Filter words with `probability < 0.01`? Or leave that to consumers.
- **Non-Latin scripts**: CJK languages where "words" aren't space-separated. whisper.cpp handles this at the token level, so it should work, but verify with Japanese/Chinese audio.
- **whisper-cli version compatibility**: `--output-json` flag may not exist in older versions. Detect and throw a helpful error.

## Future Possibilities

- **Speaker diarization**: Add `speaker` field when whisper.cpp adds speaker ID support
- **Confidence filtering**: CLI flag to filter out low-confidence words
- **Alignment correction**: Post-process timestamps using forced alignment tools
