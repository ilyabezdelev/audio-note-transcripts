import { readFile, writeFile } from 'fs/promises';
import { parseVttFile, parseTimestamp } from './markdown.js';
import { PodcastTranscript } from './types.js';

export async function convertToPodcastJson(vttPath: string, outputPath: string): Promise<void> {
  const content = await readFile(vttPath, 'utf-8');
  const segments = parseVttFile(content);

  const transcript: PodcastTranscript = {
    version: '1.0.0',
    segments: segments.map((s) => ({
      startTime: parseTimestamp(s.startTime),
      endTime: parseTimestamp(s.endTime),
      body: s.text,
    })),
  };

  await writeFile(outputPath, JSON.stringify(transcript, null, 2) + '\n', 'utf-8');
}
