#!/usr/bin/env node

import { convertToWav } from './ffmpeg.js';

const inputFile = process.argv[2] || 'input/sample.m4a';
const outputFile = '.tmp/test-conversion.wav';

console.log('Testing FFmpeg conversion...');
console.log('Input:', inputFile);
console.log('Output:', outputFile);
console.log();

try {
  const duration = await convertToWav(inputFile, outputFile);
  console.log('✓ Conversion successful!');
  console.log('Duration:', duration.toFixed(2), 'seconds');
  console.log('Output file:', outputFile);
} catch (error) {
  console.error('✗ Conversion failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
