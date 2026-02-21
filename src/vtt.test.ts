import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { addMetadata, getAudioCreationDate } from './vtt.js';
import { TranscriptMetadata } from './types.js';

let tmpDir: string | null = null;

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    tmpDir = null;
  }
});

const metadata: TranscriptMetadata = {
  source: '/test/audio.m4a',
  created: new Date(2025, 11, 20, 20, 57, 42),
  duration: 97.17,
  transcribedAt: new Date(2025, 11, 20, 21, 38, 28),
  model: 'large-v3-turbo',
  language: 'en',
};

describe('addMetadata', () => {
  it('injects NOTE section after WEBVTT header', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'vtt-test-'));
    const vttPath = join(tmpDir, 'test.vtt');
    const originalContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
Hello world.

`;
    await writeFile(vttPath, originalContent, 'utf-8');
    await addMetadata(vttPath, metadata);

    const result = await readFile(vttPath, 'utf-8');
    expect(result).toContain('WEBVTT');
    expect(result).toContain('NOTE');
    expect(result).toContain('Source: /test/audio.m4a');
    expect(result).toContain('Duration: 00:01:37');
    expect(result).toContain('Model: large-v3-turbo');
    expect(result).toContain('Language: en (English)');
    expect(result).toContain('Engine: whisper.cpp');
    // Original content preserved
    expect(result).toContain('00:00:00.000 --> 00:00:05.000');
    expect(result).toContain('Hello world.');
  });

  it('throws on non-VTT content', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'vtt-test-'));
    const vttPath = join(tmpDir, 'bad.vtt');
    await writeFile(vttPath, 'This is not a VTT file', 'utf-8');

    await expect(addMetadata(vttPath, metadata)).rejects.toThrow('Invalid VTT file');
  });

  it('throws on missing file', async () => {
    await expect(addMetadata('/nonexistent/path.vtt', metadata)).rejects.toThrow();
  });
});

describe('getAudioCreationDate', () => {
  it('returns a Date for an existing file', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'vtt-test-'));
    const filePath = join(tmpDir, 'dummy.txt');
    await writeFile(filePath, 'test', 'utf-8');

    const date = await getAudioCreationDate(filePath);
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  it('throws on missing file', async () => {
    await expect(getAudioCreationDate('/nonexistent/file.m4a')).rejects.toThrow();
  });
});
