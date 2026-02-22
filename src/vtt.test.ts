import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { getAudioCreationDate } from './vtt.js';

let tmpDir: string | null = null;

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    tmpDir = null;
  }
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
