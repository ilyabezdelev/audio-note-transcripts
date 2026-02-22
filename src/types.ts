export type OutputFormat = 'markdown' | 'vtt' | 'podcast-json' | 'srt' | 'word-json';

export const VALID_FORMATS: OutputFormat[] = ['markdown', 'vtt', 'podcast-json', 'srt', 'word-json'];

export const FORMAT_DESCRIPTIONS: Record<OutputFormat, string> = {
  markdown: 'Merged paragraphs with optional metadata',
  vtt: 'WebVTT with timestamps',
  'podcast-json': 'Podcasting 2.0 transcript JSON',
  srt: 'SubRip subtitle format',
  'word-json': 'Word-level timestamps JSON',
};

export interface TranscriptionConfig {
  outputPath?: string;
  modelName: string;
  modelPath: string;
  language: string;
  format: OutputFormat;
  suppressMetadata?: boolean;
  suppressConsoleOutput?: boolean;
  log?: (message: string) => void;
}

export interface TranscriptionResult {
  outputPath: string;
  duration: number;
  modelUsed: string;
  language: string;
  format: OutputFormat;
}

export interface TranscriptMetadata {
  source: string;
  created: Date;
  duration: number;
  transcribedAt: Date;
  model: string;
  language: string;
}

export interface TranscriptSegment {
  startTime: string;
  endTime: string;
  text: string;
}

export interface PodcastTranscriptSegment {
  startTime: number;
  endTime: number;
  body: string;
}

export interface PodcastTranscript {
  version: string;
  segments: PodcastTranscriptSegment[];
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface WordLevelTranscript {
  version: string;
  duration: number;
  language: string;
  words: WordTimestamp[];
}
