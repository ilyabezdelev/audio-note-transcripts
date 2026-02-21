import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import {
  formatDuration,
  formatDate,
  getLanguageName,
  parseVttFile,
  parseTimestamp,
  mergeSegments,
  convertToMarkdown,
} from './markdown.js';
import { TranscriptMetadata } from './types.js';

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(97)).toBe('00:01:37');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(97.17)).toBe('00:01:37');
  });
});

describe('formatDate', () => {
  it('formats a date correctly', () => {
    const date = new Date(2025, 11, 20, 20, 57, 42); // month is 0-indexed
    expect(formatDate(date)).toBe('2025-12-20 20:57:42');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2025, 0, 5, 3, 7, 9);
    expect(formatDate(date)).toBe('2025-01-05 03:07:09');
  });
});

describe('getLanguageName', () => {
  it('returns English for "en"', () => {
    expect(getLanguageName('en')).toBe('English');
  });

  it('returns Russian for "ru"', () => {
    expect(getLanguageName('ru')).toBe('Russian');
  });

  it('returns Auto-detect for "auto"', () => {
    expect(getLanguageName('auto')).toBe('Auto-detect');
  });

  it('passes through unknown codes', () => {
    expect(getLanguageName('sw')).toBe('sw');
  });
});

describe('parseTimestamp', () => {
  it('parses zero timestamp', () => {
    expect(parseTimestamp('00:00:00.000')).toBe(0);
  });

  it('parses milliseconds', () => {
    expect(parseTimestamp('00:00:00.720')).toBeCloseTo(0.72);
  });

  it('parses minutes and seconds', () => {
    expect(parseTimestamp('00:01:37.000')).toBe(97);
  });

  it('parses hours', () => {
    expect(parseTimestamp('01:30:00.000')).toBe(5400);
  });

  it('parses full timestamp', () => {
    expect(parseTimestamp('01:02:03.456')).toBeCloseTo(3723.456);
  });
});

describe('parseVttFile', () => {
  it('parses standard multi-segment VTT', () => {
    const vtt = `WEBVTT

00:00:00.720 --> 00:00:05.280
Hello and welcome.

00:00:05.280 --> 00:00:10.440
Today we talk about transcription.

`;
    const segments = parseVttFile(vtt);
    expect(segments).toEqual([
      { startTime: '00:00:00.720', endTime: '00:00:05.280', text: 'Hello and welcome.' },
      { startTime: '00:00:05.280', endTime: '00:00:10.440', text: 'Today we talk about transcription.' },
    ]);
  });

  it('returns empty array for empty VTT', () => {
    const vtt = `WEBVTT

`;
    expect(parseVttFile(vtt)).toEqual([]);
  });

  it('handles single segment', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:03.000
Just one line.
`;
    const segments = parseVttFile(vtt);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      startTime: '00:00:00.000',
      endTime: '00:00:03.000',
      text: 'Just one line.',
    });
  });

  it('joins multi-line cue text', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
First line of the cue.
Second line of the cue.

`;
    const segments = parseVttFile(vtt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('First line of the cue. Second line of the cue.');
  });

  it('skips NOTE sections', () => {
    const vtt = `WEBVTT

NOTE
Source: test.m4a
Model: large-v3-turbo

00:00:00.000 --> 00:00:03.000
Actual transcript text.

`;
    const segments = parseVttFile(vtt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Actual transcript text.');
  });

  it('skips segments with empty text', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:01.000

00:00:01.000 --> 00:00:03.000
Real text here.

`;
    const segments = parseVttFile(vtt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Real text here.');
  });
});

describe('mergeSegments', () => {
  it('returns empty array for empty input', () => {
    expect(mergeSegments([])).toEqual([]);
  });

  it('returns single segment as-is', () => {
    const segments = [{ startTime: '00:00:00.000', endTime: '00:00:01.000', text: 'Hello' }];
    const result = mergeSegments(segments, 3);
    expect(result).toEqual([{ startTime: '00:00:00.000', endTime: '00:00:01.000', text: 'Hello' }]);
  });

  it('merges 2 segments when minLines=3', () => {
    const segments = [
      { startTime: '00:00:00.000', endTime: '00:00:02.000', text: 'Line one.' },
      { startTime: '00:00:02.000', endTime: '00:00:04.000', text: 'Line two.' },
    ];
    const result = mergeSegments(segments, 3);
    expect(result).toEqual([
      { startTime: '00:00:00.000', endTime: '00:00:04.000', text: 'Line one. Line two.' },
    ]);
  });

  it('groups exactly at minLines boundary', () => {
    const segments = [
      { startTime: '00:00:00.000', endTime: '00:00:01.000', text: 'A' },
      { startTime: '00:00:01.000', endTime: '00:00:02.000', text: 'B' },
      { startTime: '00:00:02.000', endTime: '00:00:03.000', text: 'C' },
    ];
    const result = mergeSegments(segments, 3);
    expect(result).toEqual([{ startTime: '00:00:00.000', endTime: '00:00:03.000', text: 'A B C' }]);
  });

  it('handles 7 segments with minLines=3', () => {
    const segments = Array.from({ length: 7 }, (_, i) => ({
      startTime: `00:00:0${i}.000`,
      endTime: `00:00:0${i + 1}.000`,
      text: `Word${i}`,
    }));
    const result = mergeSegments(segments, 3);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const allText = result.map((s) => s.text).join(' ');
    for (let i = 0; i < 7; i++) {
      expect(allText).toContain(`Word${i}`);
    }
    expect(result[0].startTime).toBe('00:00:00.000');
  });

  it('keeps segments separate with minLines=1', () => {
    const segments = [
      { startTime: '00:00:00.000', endTime: '00:00:01.000', text: 'A' },
      { startTime: '00:00:01.000', endTime: '00:00:02.000', text: 'B' },
      { startTime: '00:00:02.000', endTime: '00:00:03.000', text: 'C' },
    ];
    const result = mergeSegments(segments, 1);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('A');
    expect(result[1].text).toBe('B');
    expect(result[2].text).toBe('C');
  });

  it('does not duplicate or drop any text', () => {
    const segments = Array.from({ length: 10 }, (_, i) => ({
      startTime: `00:00:${i.toString().padStart(2, '0')}.000`,
      endTime: `00:00:${(i + 1).toString().padStart(2, '0')}.000`,
      text: `Segment${i}`,
    }));
    const result = mergeSegments(segments, 3);
    const allText = result.map((s) => s.text).join(' ');
    for (let i = 0; i < 10; i++) {
      expect(allText).toContain(`Segment${i}`);
    }
    for (let i = 0; i < 10; i++) {
      const matches = allText.match(new RegExp(`Segment${i}`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('handles 4 segments with minLines=3', () => {
    const segments = [
      { startTime: '00:00:00.000', endTime: '00:00:01.000', text: 'A' },
      { startTime: '00:00:01.000', endTime: '00:00:02.000', text: 'B' },
      { startTime: '00:00:02.000', endTime: '00:00:03.000', text: 'C' },
      { startTime: '00:00:03.000', endTime: '00:00:04.000', text: 'D' },
    ];
    const result = mergeSegments(segments, 3);
    const allText = result.map((s) => s.text).join(' ');
    expect(allText).toContain('A');
    expect(allText).toContain('B');
    expect(allText).toContain('C');
    expect(allText).toContain('D');
    expect(result[0].startTime).toBe('00:00:00.000');
  });
});

describe('convertToMarkdown', () => {
  const metadata: TranscriptMetadata = {
    source: '/test/audio.m4a',
    created: new Date(2025, 11, 20, 20, 57, 42),
    duration: 97.17,
    transcribedAt: new Date(2025, 11, 20, 21, 38, 28),
    model: 'large-v3-turbo',
    language: 'en',
  };

  const sampleVtt = `WEBVTT

00:00:00.720 --> 00:00:05.280
Hello and welcome to the show.

00:00:05.280 --> 00:00:10.440
Today we are talking about transcription.

00:00:10.440 --> 00:00:15.000
It is a very interesting topic.

`;

  let tmpDir: string;

  async function writeVttAndConvert(
    vttContent: string,
    meta: TranscriptMetadata,
    minLines = 3,
    suppressMeta = false
  ): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'markdown-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const mdPath = join(tmpDir, 'test.md');
    const { writeFile } = await import('fs/promises');
    await writeFile(vttPath, vttContent, 'utf-8');
    await convertToMarkdown(vttPath, mdPath, meta, minLines, suppressMeta);
    return readFile(mdPath, 'utf-8');
  }

  const cleanup = async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  it('produces full markdown with metadata', async () => {
    const md = await writeVttAndConvert(sampleVtt, metadata);
    await cleanup();

    expect(md).toContain('# Transcript');
    expect(md).toContain('## Metadata');
    expect(md).toContain('## Transcription');
    expect(md).toContain('**Source**: /test/audio.m4a');
    expect(md).toContain('**Duration**: 00:01:37');
    expect(md).toContain('**Model**: large-v3-turbo');
    expect(md).toContain('**Language**: en (English)');
    expect(md).toContain('**Engine**: whisper.cpp');
    expect(md).toContain('**[00:00:00.720]**');
    expect(md).toContain('Hello and welcome to the show.');
  });

  it('suppresses metadata when flag is set', async () => {
    const md = await writeVttAndConvert(sampleVtt, metadata, 3, true);
    await cleanup();

    expect(md).not.toContain('# Transcript');
    expect(md).not.toContain('## Metadata');
    expect(md).not.toContain('**[');
    expect(md).toContain('Hello and welcome to the show.');
  });

  it('handles empty VTT', async () => {
    const md = await writeVttAndConvert('WEBVTT\n\n', metadata);
    await cleanup();

    expect(md).toContain('# Transcript');
    expect(md).toContain('## Transcription');
  });
});
