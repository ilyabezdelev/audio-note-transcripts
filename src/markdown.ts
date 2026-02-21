import { readFile, writeFile } from 'fs/promises';
import { TranscriptMetadata } from './types.js';

/**
 * Format duration in seconds as HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date as YYYY-MM-DD HH:MM:SS
 */
export function formatDate(date: Date): string {
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
export function getLanguageName(code: string): string {
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
 * Parse VTT file and extract timestamped segments
 * Format:
 * 00:00:00.000 --> 00:00:05.280
 * Text here
 */
export function parseVttFile(content: string): Array<{ timestamp: string; text: string }> {
  const lines = content.split('\n');
  const segments: Array<{ timestamp: string; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match timestamp line: 00:00:00.000 --> 00:00:05.280
    const match = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/);
    if (match) {
      const startTime = match[1];
      // Get the text from the next line(s) until we hit an empty line
      const textLines: string[] = [];
      i++; // Move to next line
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }
      const text = textLines.join(' ');
      if (text) {
        segments.push({ timestamp: startTime, text });
      }
    }
  }

  return segments;
}

/**
 * Merge short segments into longer paragraphs (3-5 lines minimum)
 * Groups consecutive segments until reaching minimum line count
 */
export function mergeSegments(
  segments: Array<{ timestamp: string; text: string }>,
  minLines: number = 3
): Array<{ timestamp: string; text: string }> {
  if (segments.length === 0) return [];

  const merged: Array<{ timestamp: string; text: string }> = [];
  let i = 0;

  while (i < segments.length) {
    const end = Math.min(i + minLines, segments.length);
    const group = segments.slice(i, end);
    merged.push({
      timestamp: group[0].timestamp,
      text: group.map((s) => s.text).join(' '),
    });
    i = end;
  }

  return merged;
}

/**
 * Convert VTT transcription to Markdown format
 * @param vttPath Path to VTT file from whisper-cli
 * @param outputPath Path where markdown file should be saved
 * @param metadata Metadata to include in markdown
 * @param minLines Minimum lines per paragraph (default: 3)
 * @param suppressMetadata Suppress metadata and timestamps (default: false)
 */
export async function convertToMarkdown(
  vttPath: string,
  outputPath: string,
  metadata: TranscriptMetadata,
  minLines: number = 3,
  suppressMetadata: boolean = false
): Promise<void> {
  // Read VTT file
  const content = await readFile(vttPath, 'utf-8');

  // Parse segments
  const segments = parseVttFile(content);

  // Merge into longer paragraphs
  const mergedSegments = mergeSegments(segments, minLines);

  // Build markdown content
  const markdown: string[] = [];

  if (suppressMetadata) {
    // Just add the text without any metadata or timestamps
    for (const segment of mergedSegments) {
      markdown.push(segment.text);
      markdown.push('');
    }
  } else {
    // Include full metadata and timestamps
    markdown.push('# Transcript');
    markdown.push('');
    markdown.push('## Metadata');
    markdown.push('');
    markdown.push(`- **Source**: ${metadata.source}`);
    markdown.push(`- **Created**: ${formatDate(metadata.created)}`);
    markdown.push(`- **Duration**: ${formatDuration(metadata.duration)}`);
    markdown.push(`- **Transcribed**: ${formatDate(metadata.transcribedAt)}`);
    markdown.push(`- **Model**: ${metadata.model}`);
    markdown.push(`- **Language**: ${metadata.language} (${getLanguageName(metadata.language)})`);
    markdown.push(`- **Engine**: whisper.cpp`);
    markdown.push('');
    markdown.push('## Transcription');
    markdown.push('');

    // Add merged segments with timestamps
    for (const segment of mergedSegments) {
      markdown.push(`**[${segment.timestamp}]**`);
      markdown.push('');
      markdown.push(segment.text);
      markdown.push('');
    }
  }

  // Write markdown file
  await writeFile(outputPath, markdown.join('\n'), 'utf-8');
}
