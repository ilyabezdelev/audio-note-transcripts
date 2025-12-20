#!/usr/bin/env node

import { Command } from 'commander';
import { transcribeAudio } from './transcribe.js';
import { resolve } from 'path';

const program = new Command();

program
  .name('transcribe')
  .description('Transcribe audio files to markdown or VTT format using whisper.cpp')
  .version('0.1.0')
  .argument('<input>', 'Input audio file path')
  .option('--model <name>', 'Model to use', 'large-v3-turbo')
  .option('--model-path <path>', 'Path to model file')
  .option('--output <path>', 'Output file or directory path')
  .option('--language <code>', 'Language code (ru, en, auto)', 'auto')
  .option('--format <type>', 'Output format (markdown, vtt)', 'markdown')
  .action(async (input, options) => {
    try {
      // Resolve input path to absolute path
      const inputPath = resolve(input);

      // Determine model path
      const modelPath = options.modelPath || `~/.whisper-models/ggml-${options.model}.bin`;

      // Resolve output path if provided
      const outputPath = options.output ? resolve(options.output) : undefined;

      // Validate format
      const format = options.format.toLowerCase();
      if (format !== 'markdown' && format !== 'vtt') {
        throw new Error(`Invalid format: ${format}. Must be 'markdown' or 'vtt'.`);
      }

      // Call transcription pipeline
      const result = await transcribeAudio(inputPath, {
        inputPath: inputPath,
        outputPath: outputPath,
        modelName: options.model,
        modelPath: modelPath,
        language: options.language,
        format: format,
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

program.parse();
