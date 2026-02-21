import { spawn } from 'child_process';
import { rename } from 'fs/promises';
import { basename, join } from 'path';
import { homedir } from 'os';

export async function transcribe(
  wavPath: string,
  modelPath: string,
  outputDir?: string,
  language?: string,
  suppressConsoleOutput?: boolean
): Promise<string> {
  const expandedModelPath = modelPath.replace(/^~/, homedir());

  return new Promise((resolve, reject) => {
    const args = ['-m', expandedModelPath, '-f', wavPath, '--output-vtt'];

    // Add language flag if specified (and not 'auto')
    if (language && language !== 'auto') {
      args.push('-l', language);
    }

    const whisper = spawn('whisper-cli', args);

    let stdoutOutput = '';
    let stderrOutput = '';

    // Capture stdout (transcription text)
    whisper.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      stdoutOutput += output;
      // Print progress to console (unless suppressed)
      if (!suppressConsoleOutput) {
        process.stdout.write(output);
      }
    });

    // Capture stderr (model loading info, progress)
    whisper.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    whisper.on('close', async (code) => {
      if (code === 0) {
        try {
          // whisper-cli always creates VTT file as <input>.vtt
          const vttPath = `${wavPath}.vtt`;

          // If outputDir is specified, move the file there
          if (outputDir) {
            const filename = basename(vttPath);
            const targetPath = join(outputDir, filename);

            // Move VTT file to output directory
            await rename(vttPath, targetPath);
            resolve(targetPath);
          } else {
            resolve(vttPath);
          }
        } catch (error) {
          reject(
            new Error(
              `Transcription completed but failed to move VTT file: ${
                error instanceof Error ? error.message : error
              }`
            )
          );
        }
      } else {
        reject(
          new Error(
            `whisper-cli failed with code ${code}\n` +
              `Command: whisper-cli ${args.join(' ')}\n` +
              `Output: ${stderrOutput}`
          )
        );
      }
    });

    whisper.on('error', (error) => {
      reject(new Error(`Failed to spawn whisper-cli: ${error.message}`));
    });
  });
}
