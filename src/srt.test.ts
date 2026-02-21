import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { convertToSrt } from './srt.js';

describe('convertToSrt', () => {
  let tmpDir: string;

  const cleanup = async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  it('converts VTT to numbered SRT cues with comma separators', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'srt-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const srtPath = join(tmpDir, 'test.srt');

    await writeFile(
      vttPath,
      `WEBVTT

00:00:00.720 --> 00:00:05.280
Hello and welcome.

00:00:05.280 --> 00:00:10.440
Today we talk about transcription.

`,
      'utf-8'
    );

    await convertToSrt(vttPath, srtPath);
    const result = await readFile(srtPath, 'utf-8');
    await cleanup();

    const expected = [
      '1',
      '00:00:00,720 --> 00:00:05,280',
      'Hello and welcome.',
      '',
      '2',
      '00:00:05,280 --> 00:00:10,440',
      'Today we talk about transcription.',
      '',
    ].join('\n');

    expect(result).toBe(expected);
  });

  it('produces empty output for empty VTT', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'srt-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const srtPath = join(tmpDir, 'test.srt');

    await writeFile(vttPath, 'WEBVTT\n\n', 'utf-8');
    await convertToSrt(vttPath, srtPath);
    const result = await readFile(srtPath, 'utf-8');
    await cleanup();

    expect(result).toBe('');
  });

  it('handles single segment', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'srt-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const srtPath = join(tmpDir, 'test.srt');

    await writeFile(
      vttPath,
      `WEBVTT

00:00:00.000 --> 00:00:03.500
Just one cue.

`,
      'utf-8'
    );

    await convertToSrt(vttPath, srtPath);
    const result = await readFile(srtPath, 'utf-8');
    await cleanup();

    expect(result).toContain('1\n');
    expect(result).toContain('00:00:00,000 --> 00:00:03,500');
    expect(result).toContain('Just one cue.');
  });
});
