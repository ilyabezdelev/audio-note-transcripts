import { readFile, writeFile, stat } from 'fs/promises';
import { TranscriptMetadata } from './types.js';
import { formatDuration, formatDate, getLanguageName } from './markdown.js';

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
