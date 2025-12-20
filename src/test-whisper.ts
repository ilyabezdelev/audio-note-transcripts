#!/usr/bin/env node

import { transcribe } from './whisper.js';

const wavPath = '.tmp/test-conversion.wav';
const modelPath = '~/.whisper-models/ggml-base.bin';
const outputDir = '.tmp';
const language = 'auto';

console.log('Testing Whisper transcription...');
console.log('Input WAV:', wavPath);
console.log('Model:', modelPath);
console.log('Output directory:', outputDir);
console.log('Language:', language);
console.log();

try {
  const outputPath = await transcribe(wavPath, modelPath, 'vtt', outputDir, language);
  console.log();
  console.log('✓ Transcription successful!');
  console.log('VTT file created at:', outputPath);
} catch (error) {
  console.error('✗ Transcription failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
