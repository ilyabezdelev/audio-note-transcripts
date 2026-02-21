import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseWhisperJson, convertToWordJson } from './word-json.js';

describe('parseWhisperJson', () => {
  it('extracts words with timestamps and probabilities', () => {
    const raw = {
      transcription: [
        {
          timestamps: { from: '00:00:00.720', to: '00:00:05.280' },
          offsets: { from: 720, to: 5280 },
          text: ' Hello and welcome',
          tokens: [
            {
              text: ' Hello',
              timestamps: { from: '00:00:00.720', to: '00:00:01.040' },
              offsets: { from: 720, to: 1040 },
              id: 2425,
              p: 0.95,
            },
            {
              text: ' and',
              timestamps: { from: '00:00:01.040', to: '00:00:01.180' },
              offsets: { from: 1040, to: 1180 },
              id: 293,
              p: 0.98,
            },
            {
              text: ' welcome',
              timestamps: { from: '00:00:01.180', to: '00:00:01.560' },
              offsets: { from: 1180, to: 1560 },
              id: 6188,
              p: 0.92,
            },
          ],
        },
      ],
    };

    const words = parseWhisperJson(raw);
    expect(words).toHaveLength(3);
    expect(words[0]).toEqual({ word: 'Hello', start: 0.72, end: 1.04, probability: 0.95 });
    expect(words[1]).toEqual({ word: 'and', start: 1.04, end: 1.18, probability: 0.98 });
    expect(words[2]).toEqual({ word: 'welcome', start: 1.18, end: 1.56, probability: 0.92 });
  });

  it('merges trailing punctuation into preceding word', () => {
    const raw = {
      transcription: [
        {
          timestamps: { from: '00:00:00.000', to: '00:00:02.000' },
          offsets: { from: 0, to: 2000 },
          text: ' Hello,',
          tokens: [
            {
              text: ' Hello',
              timestamps: { from: '00:00:00.000', to: '00:00:00.500' },
              offsets: { from: 0, to: 500 },
              id: 1,
              p: 0.95,
            },
            {
              text: ',',
              timestamps: { from: '00:00:00.500', to: '00:00:00.600' },
              offsets: { from: 500, to: 600 },
              id: 2,
              p: 0.99,
            },
            {
              text: ' world',
              timestamps: { from: '00:00:00.600', to: '00:00:01.000' },
              offsets: { from: 600, to: 1000 },
              id: 3,
              p: 0.9,
            },
            {
              text: '.',
              timestamps: { from: '00:00:01.000', to: '00:00:01.100' },
              offsets: { from: 1000, to: 1100 },
              id: 4,
              p: 0.98,
            },
          ],
        },
      ],
    };

    const words = parseWhisperJson(raw);
    expect(words).toHaveLength(2);
    expect(words[0].word).toBe('Hello,');
    expect(words[0].end).toBe(0.6);
    expect(words[1].word).toBe('world.');
    expect(words[1].end).toBe(1.1);
  });

  it('skips whitespace-only tokens', () => {
    const raw = {
      transcription: [
        {
          timestamps: { from: '00:00:00.000', to: '00:00:01.000' },
          offsets: { from: 0, to: 1000 },
          text: ' Hi',
          tokens: [
            {
              text: '  ',
              timestamps: { from: '00:00:00.000', to: '00:00:00.100' },
              offsets: { from: 0, to: 100 },
              id: 0,
              p: 0.5,
            },
            {
              text: ' Hi',
              timestamps: { from: '00:00:00.100', to: '00:00:00.500' },
              offsets: { from: 100, to: 500 },
              id: 1,
              p: 0.9,
            },
          ],
        },
      ],
    };

    const words = parseWhisperJson(raw);
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('Hi');
  });

  it('returns empty array for empty transcription', () => {
    const raw = { transcription: [] };
    expect(parseWhisperJson(raw)).toEqual([]);
  });
});

describe('convertToWordJson', () => {
  let tmpDir: string;

  const cleanup = async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  it('writes word-level JSON file', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'word-json-test-'));
    const inputPath = join(tmpDir, 'whisper.json');
    const outputPath = join(tmpDir, 'words.json');

    const whisperOutput = {
      transcription: [
        {
          timestamps: { from: '00:00:00.000', to: '00:00:01.000' },
          offsets: { from: 0, to: 1000 },
          text: ' Test',
          tokens: [
            {
              text: ' Test',
              timestamps: { from: '00:00:00.000', to: '00:00:00.500' },
              offsets: { from: 0, to: 500 },
              id: 1,
              p: 0.95,
            },
          ],
        },
      ],
    };

    await writeFile(inputPath, JSON.stringify(whisperOutput), 'utf-8');
    await convertToWordJson(inputPath, outputPath, 97.17, 'en');

    const result = JSON.parse(await readFile(outputPath, 'utf-8'));
    await cleanup();

    expect(result.version).toBe('1.0.0');
    expect(result.duration).toBe(97.17);
    expect(result.language).toBe('en');
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toEqual({ word: 'Test', start: 0, end: 0.5, probability: 0.95 });
  });
});
