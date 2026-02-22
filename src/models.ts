import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const MODELS_DIR = join(homedir(), '.whisper-models');

export interface InstalledModel {
  name: string;
  sizeBytes: number;
}

export interface AvailableModel {
  name: string;
  filename: string;
  sizeDescription: string;
  description: string;
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { name: 'tiny', filename: 'ggml-tiny.bin', sizeDescription: '~75 MB', description: 'Fastest, lowest quality' },
  { name: 'base', filename: 'ggml-base.bin', sizeDescription: '~141 MB', description: 'Fast, good quality' },
  { name: 'small', filename: 'ggml-small.bin', sizeDescription: '~466 MB', description: 'Balanced' },
  { name: 'medium', filename: 'ggml-medium.bin', sizeDescription: '~1.5 GB', description: 'High quality' },
  { name: 'large-v3', filename: 'ggml-large-v3.bin', sizeDescription: '~3.1 GB', description: 'Highest quality' },
  {
    name: 'large-v3-turbo',
    filename: 'ggml-large-v3-turbo.bin',
    sizeDescription: '~1.5 GB',
    description: 'Best speed/quality balance (recommended)',
  },
];

export function getInstalledModels(): InstalledModel[] {
  try {
    const files = readdirSync(MODELS_DIR);
    return files
      .filter((f) => f.startsWith('ggml-') && f.endsWith('.bin'))
      .map((f) => ({
        name: f.replace(/^ggml-/, '').replace(/\.bin$/, ''),
        sizeBytes: statSync(join(MODELS_DIR, f)).size,
      }));
  } catch {
    return [];
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  return `${Math.round(bytes / 1_000)} KB`;
}

export function getModelDownloadUrl(filename: string): string {
  return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${filename}`;
}
