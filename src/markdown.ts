import { readFile, writeFile } from 'fs/promises';
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
 * Parse VTT file and extract timestamped segments
 * Format:
 * 00:00:00.000 --> 00:00:05.280
 * Text here
 */
function parseVttFile(content: string): Array<{ timestamp: string; text: string }> {
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
function mergeSegments(
  segments: Array<{ timestamp: string; text: string }>,
  minLines: number = 3
): Array<{ timestamp: string; text: string }> {
  if (segments.length === 0) return [];

  const merged: Array<{ timestamp: string; text: string }> = [];
  let currentGroup = {
    timestamp: segments[0].timestamp,
    texts: [segments[0].text],
  };

  for (let i = 1; i < segments.length; i++) {
    currentGroup.texts.push(segments[i].text);

    // Check if we have enough lines or if this is the last segment
    if (currentGroup.texts.length >= minLines || i === segments.length - 1) {
      merged.push({
        timestamp: currentGroup.timestamp,
        text: currentGroup.texts.join(' '),
      });

      // Start new group if not at the end
      if (i < segments.length - 1) {
        currentGroup = {
          timestamp: segments[i + 1].timestamp,
          texts: [segments[i + 1].text],
        };
        i++; // Skip the next segment since we already added it
      }
    }
  }

  return merged;
}

/**
 * Convert VTT transcription to Markdown format
 * @param vttPath Path to VTT file from whisper-cli
 * @param outputPath Path where markdown file should be saved
 * @param metadata Metadata to include in markdown
 * @param minLines Minimum lines per paragraph (default: 3)
 */
export async function convertToMarkdown(
  vttPath: string,
  outputPath: string,
  metadata: TranscriptMetadata,
  minLines: number = 3
): Promise<void> {
  // Read VTT file
  const content = await readFile(vttPath, 'utf-8');

  // Parse segments
  const segments = parseVttFile(content);

  // Merge into longer paragraphs
  const mergedSegments = mergeSegments(segments, minLines);

  // Build markdown content
  const markdown = [
    '# Transcript',
    '',
    '## Metadata',
    '',
    `- **Source**: ${metadata.source}`,
    `- **Created**: ${formatDate(metadata.created)}`,
    `- **Duration**: ${formatDuration(metadata.duration)}`,
    `- **Transcribed**: ${formatDate(metadata.transcribedAt)}`,
    `- **Model**: ${metadata.model}`,
    `- **Language**: ${metadata.language} (${getLanguageName(metadata.language)})`,
    `- **Engine**: whisper.cpp`,
    '',
    '## Transcription',
    '',
  ];

  // Add merged segments
  for (const segment of mergedSegments) {
    markdown.push(`**[${segment.timestamp}]**`);
    markdown.push('');
    markdown.push(segment.text);
    markdown.push('');
  }

  // Write markdown file
  await writeFile(outputPath, markdown.join('\n'), 'utf-8');
}
