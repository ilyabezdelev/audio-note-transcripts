import { readFile, writeFile } from 'fs/promises';
import { WordTimestamp, WordLevelTranscript } from './types.js';

interface WhisperToken {
  text: string;
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  id: number;
  p: number;
}

interface WhisperSegment {
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  text: string;
  tokens: WhisperToken[];
}

interface WhisperJsonOutput {
  transcription: WhisperSegment[];
}

function isPunctuation(text: string): boolean {
  return /^[.,;:!?\-–—'")\]}>…]+$/.test(text);
}

export function parseWhisperJson(raw: WhisperJsonOutput): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  for (const segment of raw.transcription) {
    for (const token of segment.tokens) {
      const text = token.text.trim();
      if (!text) continue;

      if (isPunctuation(text) && words.length > 0) {
        const prev = words[words.length - 1];
        prev.word += text;
        prev.end = token.offsets.to / 1000;
      } else {
        words.push({
          word: text,
          start: token.offsets.from / 1000,
          end: token.offsets.to / 1000,
          probability: token.p,
        });
      }
    }
  }

  return words;
}

export async function convertToWordJson(
  whisperJsonPath: string,
  outputPath: string,
  duration: number,
  language: string
): Promise<void> {
  const content = await readFile(whisperJsonPath, 'utf-8');
  const raw: WhisperJsonOutput = JSON.parse(content);
  const words = parseWhisperJson(raw);

  const transcript: WordLevelTranscript = {
    version: '1.0.0',
    duration,
    language,
    words,
  };

  await writeFile(outputPath, JSON.stringify(transcript, null, 2) + '\n', 'utf-8');
}
