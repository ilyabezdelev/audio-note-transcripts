import { readFile, writeFile } from 'fs/promises';
import { parseVttFile } from './markdown.js';

function vttTimestampToSrt(ts: string): string {
  return ts.replace('.', ',');
}

export async function convertToSrt(vttPath: string, outputPath: string): Promise<void> {
  const content = await readFile(vttPath, 'utf-8');
  const segments = parseVttFile(content);

  const srtLines: string[] = [];
  segments.forEach((s, i) => {
    srtLines.push(String(i + 1));
    srtLines.push(`${vttTimestampToSrt(s.startTime)} --> ${vttTimestampToSrt(s.endTime)}`);
    srtLines.push(s.text);
    srtLines.push('');
  });

  await writeFile(outputPath, srtLines.join('\n'), 'utf-8');
}
