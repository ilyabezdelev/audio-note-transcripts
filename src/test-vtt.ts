#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { addMetadata, getAudioCreationDate } from './vtt.js';

const vttPath = '.tmp/large-v3-turbo-output.vtt';
const audioPath = 'input/sample.m4a';

console.log('Testing VTT metadata injection...');
console.log('VTT file:', vttPath);
console.log('Audio file:', audioPath);
console.log();

try {
  // Get audio creation date
  const created = await getAudioCreationDate(audioPath);
  console.log('Audio created:', created);

  // Prepare metadata
  const metadata = {
    source: audioPath,
    created: created,
    duration: 97.17,
    model: 'large-v3-turbo',
    language: 'auto',
    transcribedAt: new Date(),
  };

  // Add metadata to VTT
  await addMetadata(vttPath, metadata);
  console.log('✓ Metadata added successfully');
  console.log();

  // Display the enhanced VTT file
  const content = await readFile(vttPath, 'utf-8');
  const lines = content.split('\n');
  console.log('Enhanced VTT (first 30 lines):');
  console.log('─'.repeat(60));
  console.log(lines.slice(0, 30).join('\n'));
  console.log('─'.repeat(60));
} catch (error) {
  console.error('✗ Test failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
