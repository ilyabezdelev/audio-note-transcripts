#!/usr/bin/env node

import { transcribeAudio } from './transcribe.js';

const inputPath = 'input/sample.m4a';

console.log('Testing complete transcription pipeline...');
console.log('Input:', inputPath);
console.log('Model: base');
console.log('Output: .tmp/pipeline-test.vtt');
console.log();
console.log('='.repeat(60));
console.log();

try {
  const result = await transcribeAudio(inputPath, {
    inputPath: inputPath,
    outputPath: '.tmp/pipeline-test.md',
    modelName: 'base',
    modelPath: '~/.whisper-models/ggml-base.bin',
    language: 'auto',
    format: 'markdown',
  });

  console.log();
  console.log('='.repeat(60));
  console.log();
  console.log('✓ Pipeline test successful!');
  console.log();
  console.log('Results:');
  console.log('  Output path:', result.outputPath);
  console.log('  Format:', result.format);
  console.log('  Duration:', result.duration.toFixed(2), 'seconds');
  console.log('  Model:', result.modelUsed);
  console.log('  Language:', result.language);
} catch (error) {
  console.error();
  console.error('='.repeat(60));
  console.error();
  console.error('✗ Pipeline test failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
