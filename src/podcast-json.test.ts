import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { convertToPodcastJson } from './podcast-json.js';

describe('convertToPodcastJson', () => {
  let tmpDir: string;

  const cleanup = async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  it('converts VTT to podcast JSON with float timestamps', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'podcast-json-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const jsonPath = join(tmpDir, 'test.json');

    await writeFile(
      vttPath,
      `WEBVTT

00:00:00.720 --> 00:00:05.280
Hello and welcome to the podcast.

00:00:05.280 --> 00:00:10.440
Today we're talking about transcription.

`,
      'utf-8'
    );

    await convertToPodcastJson(vttPath, jsonPath);
    const result = JSON.parse(await readFile(jsonPath, 'utf-8'));
    await cleanup();

    expect(result.version).toBe('1.0.0');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({
      startTime: 0.72,
      endTime: 5.28,
      body: 'Hello and welcome to the podcast.',
    });
    expect(result.segments[1]).toEqual({
      startTime: 5.28,
      endTime: 10.44,
      body: "Today we're talking about transcription.",
    });
  });

  it('produces empty segments for empty VTT', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'podcast-json-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const jsonPath = join(tmpDir, 'test.json');

    await writeFile(vttPath, 'WEBVTT\n\n', 'utf-8');
    await convertToPodcastJson(vttPath, jsonPath);
    const result = JSON.parse(await readFile(jsonPath, 'utf-8'));
    await cleanup();

    expect(result.version).toBe('1.0.0');
    expect(result.segments).toEqual([]);
  });

  it('handles hour-long timestamps', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'podcast-json-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const jsonPath = join(tmpDir, 'test.json');

    await writeFile(
      vttPath,
      `WEBVTT

01:30:00.000 --> 01:30:05.500
Deep into the episode now.

`,
      'utf-8'
    );

    await convertToPodcastJson(vttPath, jsonPath);
    const result = JSON.parse(await readFile(jsonPath, 'utf-8'));
    await cleanup();

    expect(result.segments[0].startTime).toBe(5400);
    expect(result.segments[0].endTime).toBe(5405.5);
  });
});
