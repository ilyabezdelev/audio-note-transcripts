# Podcast Transcripts

## Goal

Produce podcast-compatible transcripts in three formats:

1. **Podcast JSON** — structured transcript following the Podcasting 2.0 `podcast:transcript` JSON spec
2. **VTT with short segments** — WebVTT optimized for podcast players (short cues, not merged)
3. **SRT** — SubRip format for broad compatibility

All three formats use short, unmerged segments (one whisper cue = one output segment), unlike the current markdown output which merges 3-5 segments into paragraphs.

## Podcast JSON Spec

The Podcasting 2.0 transcript JSON format (`application/json` in the `<podcast:transcript>` tag):

```json
{
  "version": "1.0.0",
  "segments": [
    {
      "startTime": 0.72,
      "endTime": 5.28,
      "body": "Hello and welcome to the podcast."
    },
    {
      "startTime": 5.28,
      "endTime": 10.44,
      "body": "Today we're talking about transcription."
    }
  ]
}
```

Key differences from Whisper's VTT:

- Times are **float seconds**, not `HH:MM:SS.mmm` strings
- Uses `startTime`/`endTime`/`body` field names
- Has a `version` field
- Optional `speaker` field (not used initially — whisper.cpp doesn't do speaker diarization)

## SRT Format

```
1
00:00:00,720 --> 00:00:05,280
Hello and welcome to the podcast.

2
00:00:05,280 --> 00:00:10,440
Today we're talking about transcription.
```

Key differences from VTT:

- Sequential numeric IDs for each cue
- Comma instead of period for millisecond separator (`00:00:00,720` not `00:00:00.720`)
- No `WEBVTT` header

## Short-segment VTT

Same as current VTT output from whisper.cpp, but with metadata injected. No merging. This is already what we produce internally before converting to markdown — we just need to expose it as a format option.

## Implementation

### New output formats

Extend `OutputFormat` in `types.ts`:

```ts
export type OutputFormat = 'markdown' | 'vtt' | 'podcast-json' | 'srt' | 'vtt-short';
```

Alternatively, keep the type simpler and add a `--podcast` flag that switches VTT/SRT to use short segments. But explicit format names are clearer.

### New types

```ts
export interface PodcastTranscriptSegment {
  startTime: number;
  endTime: number;
  body: string;
  speaker?: string;
}

export interface PodcastTranscript {
  version: string;
  segments: PodcastTranscriptSegment[];
}
```

### Parsing changes

The VTT parser in `markdown.ts` currently only captures `startTime`. It discards `endTime`. Need to capture both:

```ts
// Current
interface ParsedSegment {
  timestamp: string; // start only
  text: string;
}

// New
interface ParsedSegment {
  startTime: string; // "HH:MM:SS.mmm"
  endTime: string; // "HH:MM:SS.mmm"
  text: string;
}
```

Add a `parseTimestamp` utility to convert `"HH:MM:SS.mmm"` → float seconds.

### New modules

**`src/podcast-json.ts`**

- `convertToPodcastJson(vttPath: string, outputPath: string): Promise<void>`
- Parses VTT, maps segments to `PodcastTranscriptSegment`, writes JSON

**`src/srt.ts`**

- `convertToSrt(vttPath: string, outputPath: string): Promise<void>`
- Parses VTT, formats as numbered SRT cues

### Modifications to existing code

**`src/vtt.ts`** — `addMetadata` already works for short-segment VTT. No changes needed.

**`src/markdown.ts`** — Refactor `parseVttFile` into a shared module (`src/parsers.ts`) since podcast-json and srt will also need it. Update `parseVttFile` to capture `endTime`.

**`src/transcribe.ts`** — Add branches for new formats in Step 5:

```ts
if (config.format === 'vtt' || config.format === 'vtt-short') {
  await addMetadata(vttPath, metadata);
} else if (config.format === 'podcast-json') {
  await convertToPodcastJson(vttPath, outputPath);
} else if (config.format === 'srt') {
  await convertToSrt(vttPath, outputPath);
} else {
  await convertToMarkdown(vttPath, outputPath, metadata);
}
```

**`src/cli.ts`** — Update format option help text and validation:

```
--format <type>  Output format (markdown, vtt, podcast-json, srt)
```

### File extensions

| Format       | Extension |
| ------------ | --------- |
| markdown     | `.md`     |
| vtt          | `.vtt`    |
| vtt-short    | `.vtt`    |
| podcast-json | `.json`   |
| srt          | `.srt`    |

## Execution Plan

### Phase 1: Refactor VTT parser

1. Create `src/parsers.ts` — move `parseVttFile` there, update to capture `endTime`
2. Add `parseTimestamp(ts: string): number` utility (converts `HH:MM:SS.mmm` → seconds)
3. Update `markdown.ts` to import from `parsers.ts`
4. Verify existing markdown output is unchanged

### Phase 2: Podcast JSON

5. Add `PodcastTranscript` types to `types.ts`
6. Create `src/podcast-json.ts` with `convertToPodcastJson`
7. Wire into `transcribe.ts`
8. Add `podcast-json` to CLI format validation
9. Test with a real audio file

### Phase 3: SRT

10. Create `src/srt.ts` with `convertToSrt`
11. Wire into `transcribe.ts`
12. Add `srt` to CLI format validation
13. Test with a real audio file

### Phase 4: Short-segment VTT

14. Add `vtt-short` format option (VTT without paragraph merging, just metadata injection — this is basically what we already do for `vtt` format)
15. Differentiate `vtt` (current behavior) from `vtt-short` in CLI help

Actually — current `vtt` output IS already short segments (whisper's raw output + metadata). So `vtt-short` might be redundant. Consider whether `vtt` should stay as-is (short segments) and we just document that. The only question is whether anyone would want a "merged paragraph VTT" — probably not for podcast use cases.

**Decision**: Keep `vtt` as short segments (current behavior). No `vtt-short` needed.

Final format list: `markdown`, `vtt`, `podcast-json`, `srt`.

## Edge Cases

- **Very short audio** (< 1 segment): Produce valid output with 0 or 1 segment
- **No speech detected**: whisper produces empty VTT → produce empty JSON/SRT
- **Unicode/emoji in speech**: Pass through as-is
- **Extremely long podcasts** (2+ hours): No special handling needed, segments are streamed from VTT line by line
