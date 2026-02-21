import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { validateInputFile, checkModel } from './validate.js';

let tmpDir: string | null = null;

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    tmpDir = null;
  }
});

describe('validateInputFile', () => {
  it('resolves for an existing readable file', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'validate-test-'));
    const filePath = join(tmpDir, 'test.m4a');
    await writeFile(filePath, 'fake audio data', 'utf-8');

    await expect(validateInputFile(filePath)).resolves.toBeUndefined();
  });

  it('throws for a nonexistent file', async () => {
    await expect(validateInputFile('/nonexistent/path/audio.m4a')).rejects.toThrow(
      'Input file not found or not readable'
    );
  });
});

describe('checkModel', () => {
  it('resolves for an existing model file', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'validate-test-'));
    const modelPath = join(tmpDir, 'ggml-test.bin');
    await writeFile(modelPath, 'fake model data', 'utf-8');

    await expect(checkModel(modelPath)).resolves.toBeUndefined();
  });

  it('throws for a missing model file', async () => {
    await expect(checkModel('/nonexistent/model.bin')).rejects.toThrow(
      'Model file not found or not readable'
    );
  });

  it('error message includes download instructions', async () => {
    await expect(checkModel('/nonexistent/model.bin')).rejects.toThrow(
      'Please download a Whisper model'
    );
  });
});
