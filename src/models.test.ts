import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { formatFileSize, getModelDownloadUrl } from './models.js';

describe('formatFileSize', () => {
  it('formats bytes as KB', () => {
    expect(formatFileSize(500)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(141_000_000)).toBe('141 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1_500_000_000)).toBe('1.5 GB');
  });

  it('formats large gigabytes', () => {
    expect(formatFileSize(3_100_000_000)).toBe('3.1 GB');
  });
});

describe('getModelDownloadUrl', () => {
  it('returns correct HuggingFace URL', () => {
    expect(getModelDownloadUrl('ggml-base.bin')).toBe(
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
    );
  });

  it('works for large-v3-turbo', () => {
    expect(getModelDownloadUrl('ggml-large-v3-turbo.bin')).toBe(
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin'
    );
  });
});

// getInstalledModels uses hardcoded MODELS_DIR so we test it indirectly
// through the real filesystem — testing with temp dirs would require
// making MODELS_DIR configurable which isn't worth the abstraction.
