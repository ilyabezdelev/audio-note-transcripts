export type OutputFormat = 'markdown' | 'vtt';

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
  timestamp: string;
  text: string;
}
