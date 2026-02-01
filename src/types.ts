export type OutputFormat = 'markdown' | 'vtt';

export interface TranscriptionConfig {
  inputPath: string;
  outputPath?: string;
  modelName: string;
  modelPath: string;
  language: string;
  format: OutputFormat;
  suppressMetadata?: boolean;
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
