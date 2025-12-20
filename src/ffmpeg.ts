import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Convert audio file to 16kHz mono WAV format required by whisper-cli
 * @param inputPath Path to input audio file (M4A, OGG, MP3, etc.)
 * @param outputPath Path where WAV file should be saved
 * @returns Audio duration in seconds
 */
export async function convertToWav(inputPath: string, outputPath: string): Promise<number> {
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      inputPath,
      '-ar',
      '16000', // 16kHz sample rate
      '-ac',
      '1', // mono audio
      '-c:a',
      'pcm_s16le', // 16-bit PCM encoding
      '-y', // overwrite output file if exists
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', args);

    let stderrOutput = '';
    let duration = 0;

    // FFmpeg writes progress and metadata to stderr
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      stderrOutput += output;

      // Extract duration from ffmpeg output
      // Format: "Duration: 00:01:37.17"
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        duration = hours * 3600 + minutes * 60 + seconds;
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(duration);
      } else {
        reject(
          new Error(
            `FFmpeg conversion failed with code ${code}\n` +
              `Command: ffmpeg ${args.join(' ')}\n` +
              `Output: ${stderrOutput}`
          )
        );
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to spawn ffmpeg: ${error.message}`));
    });
  });
}
