#!/usr/bin/env node

import { Command } from 'commander';
import { transcribeAudio } from './transcribe.js';
import { resolve } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';
import { VALID_FORMATS, FORMAT_DESCRIPTIONS, OutputFormat } from './types.js';
import { getInstalledModels, formatFileSize } from './models.js';
import { runInit } from './init.js';

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
  .description('Transcribe audio files using whisper.cpp')
  .version(version)
  .argument('<input>', 'Input audio file path')
  .option('--model <name>', 'Model name (see available models below)', 'large-v3-turbo')
  .option('--model-path <path>', 'Path to model file')
  .option('--output <path>', 'Output file or directory path')
  .option('--language <code>', 'Language code (ru, en, auto)', 'auto')
  .option('--format <type>', 'Output format (see formats below)', 'markdown')
  .option('--suppress-metadata', 'Suppress metadata and timestamps in markdown output')
  .option('--suppress-console-output', 'Suppress whisper-cpp console output during transcription')
  .action(async (input, options) => {
    try {
      const inputPath = resolve(expandTilde(input));
      const modelPath = options.modelPath || `~/.whisper-models/ggml-${options.model}.bin`;
      const outputPath = options.output ? resolve(expandTilde(options.output)) : undefined;

      const format = options.format.toLowerCase();
      if (!VALID_FORMATS.includes(format as OutputFormat)) {
        throw new Error(`Invalid format: ${format}. Must be one of: ${VALID_FORMATS.join(', ')}`);
      }

      const result = await transcribeAudio(inputPath, {
        outputPath: outputPath,
        modelName: options.model,
        modelPath: modelPath,
        language: options.language,
        format: format as OutputFormat,
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

program
  .command('init')
  .description('Check dependencies and download whisper models')
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      console.error();
      console.error('Init failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.addHelpText('after', () => {
  const models = getInstalledModels();
  let text = '\nAvailable models (in ~/.whisper-models/):';
  if (models.length === 0) {
    text += '\n  (none installed — run "transcribe init" to download)';
  } else {
    for (const m of models) {
      const isDefault = m.name === 'large-v3-turbo';
      const size = formatFileSize(m.sizeBytes);
      text += `\n  ${m.name.padEnd(22)} ${size}${isDefault ? '  (default)' : ''}`;
    }
  }

  text += '\n\nOutput formats:';
  for (const fmt of VALID_FORMATS) {
    const desc = FORMAT_DESCRIPTIONS[fmt];
    const isDefault = fmt === 'markdown';
    text += `\n  ${fmt.padEnd(22)} ${desc}${isDefault ? ' (default)' : ''}`;
  }
  text += '\n';
  return text;
});

if (!process.env.VITEST) {
  if (process.argv.length <= 2) {
    program.help();
  }
  program.parse();
}
