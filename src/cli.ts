#!/usr/bin/env node

import { Command } from 'commander';
import { transcribeAudio } from './transcribe.js';
import { resolve } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~')) {
    return filePath.replace(/^~/, homedir());
  }
  return filePath;
}

program
  .name('transcribe')
  .description('Transcribe audio files to markdown or VTT format using whisper.cpp')
  .version(version)
  .argument('<input>', 'Input audio file path')
  .option('--model <name>', 'Model to use', 'large-v3-turbo')
  .option('--model-path <path>', 'Path to model file')
  .option('--output <path>', 'Output file or directory path')
  .option('--language <code>', 'Language code (ru, en, auto)', 'auto')
  .option('--format <type>', 'Output format (markdown, vtt)', 'markdown')
  .option('--suppress-metadata', 'Suppress metadata and timestamps in markdown output')
  .option('--suppress-console-output', 'Suppress whisper-cpp console output during transcription')
  .action(async (input, options) => {
    try {
      // Expand tilde and resolve input path to absolute path
      const inputPath = resolve(expandTilde(input));

      // Determine model path
      const modelPath = options.modelPath || `~/.whisper-models/ggml-${options.model}.bin`;

      // Expand tilde and resolve output path if provided
      const outputPath = options.output ? resolve(expandTilde(options.output)) : undefined;

      // Validate format
      const format = options.format.toLowerCase();
      if (format !== 'markdown' && format !== 'vtt') {
        throw new Error(`Invalid format: ${format}. Must be 'markdown' or 'vtt'.`);
      }

      // Call transcription pipeline
      const result = await transcribeAudio(inputPath, {
        outputPath: outputPath,
        modelName: options.model,
        modelPath: modelPath,
        language: options.language,
        format: format,
        suppressMetadata: options.suppressMetadata,
        suppressConsoleOutput: options.suppressConsoleOutput,
        log: console.log,
      });

      console.log();
      console.log('='.repeat(60));
      console.log();
      console.log('✓ Transcription complete!');
      console.log();
      console.log('Output file:', result.outputPath);
      console.log('Format:', result.format);
      console.log('Model:', result.modelUsed);
      console.log('Language:', result.language);
      console.log('Processing time:', result.duration.toFixed(2), 'seconds');
      console.log();
    } catch (error) {
      console.error();
      console.error('='.repeat(60));
      console.error();
      console.error('✗ Transcription failed:');
      console.error(error instanceof Error ? error.message : String(error));
      console.error();
      process.exit(1);
    }
  });

const isDirectRun =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/.*\//, '/'));

if (isDirectRun) {
  program.parse();
}
