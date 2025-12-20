import { readFile, writeFile, stat } from 'fs/promises';
import { TranscriptMetadata } from './types.js';

/**
 * Format duration in seconds as HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date as YYYY-MM-DD HH:MM:SS
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get language name from language code
 */
function getLanguageName(code: string): string {
  const languages: { [key: string]: string } = {
    auto: 'Auto-detect',
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
  };

  return languages[code] || code;
}

/**
 * Add metadata NOTE section to VTT file
 * @param vttPath Path to VTT file
 * @param metadata Metadata to inject
 */
export async function addMetadata(vttPath: string, metadata: TranscriptMetadata): Promise<void> {
  // Read existing VTT file
  const content = await readFile(vttPath, 'utf-8');

  // Check if it's a valid VTT file
  if (!content.startsWith('WEBVTT')) {
    throw new Error(`Invalid VTT file: ${vttPath}`);
  }

  // Build NOTE section
  const noteSection = [
    '',
    'NOTE',
    `Source: ${metadata.source}`,
    `Created: ${formatDate(metadata.created)}`,
    `Duration: ${formatDuration(metadata.duration)}`,
    `Transcribed: ${formatDate(metadata.transcribedAt)}`,
    `Model: ${metadata.model}`,
    `Language: ${metadata.language} (${getLanguageName(metadata.language)})`,
    'Engine: whisper.cpp',
    '',
  ].join('\n');

  // Split content into header and body
  const lines = content.split('\n');
  const headerEnd = lines[0] === 'WEBVTT' ? 1 : 0;

  // Insert NOTE section after WEBVTT header
  const enhancedContent = [
    lines.slice(0, headerEnd).join('\n'),
    noteSection,
    lines.slice(headerEnd + 1).join('\n'),
  ].join('\n');

  // Write back to file
  await writeFile(vttPath, enhancedContent, 'utf-8');
}

/**
 * Extract creation date from audio file
 * @param audioPath Path to audio file
 * @returns File creation date
 */
export async function getAudioCreationDate(audioPath: string): Promise<Date> {
  const stats = await stat(audioPath);
  return stats.birthtime;
}
