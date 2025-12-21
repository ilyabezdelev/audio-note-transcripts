import { exec } from 'child_process';
import { promisify } from 'util';
import { access, constants } from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Check if whisper-cli command is available
 */
export async function checkWhisperCli(): Promise<void> {
  try {
    await execAsync('which whisper-cli');
  } catch (error) {
    throw new Error(
      'whisper-cli not found. Please install it:\n' +
        '  brew install whisper-cpp\n' +
        'Then verify with: which whisper-cli'
    );
  }
}

/**
 * Check if ffmpeg command is available
 */
export async function checkFfmpeg(): Promise<void> {
  try {
    await execAsync('which ffmpeg');
  } catch (error) {
    throw new Error(
      'ffmpeg not found. Please install it:\n' +
        '  brew install ffmpeg\n' +
        'Then verify with: which ffmpeg'
    );
  }
}

/**
 * Check if model file exists and is readable
 */
export async function checkModel(modelPath: string): Promise<void> {
  // Expand ~ to home directory
  const expandedPath = modelPath.replace(/^~/, process.env.HOME || '~');

  try {
    await access(expandedPath, constants.R_OK);
  } catch (error) {
    throw new Error(
      `Model file not found or not readable: ${modelPath}\n` +
        'Please download a Whisper model:\n' +
        '  mkdir -p ~/.whisper-models\n' +
        '  # Download from: https://huggingface.co/ggerganov/whisper.cpp/tree/main\n' +
        '  # Save to: ~/.whisper-models/ggml-large-v3-turbo.bin'
    );
  }
}

/**
 * Validate input file exists and is readable
 * Format validation is handled by ffmpeg - any format ffmpeg supports will work
 */
export async function validateInputFile(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.R_OK);
  } catch (error) {
    throw new Error(`Input file not found or not readable: ${filePath}`);
  }
}

/**
 * Validate all dependencies at once
 */
export async function validateDependencies(modelPath: string): Promise<void> {
  await checkWhisperCli();
  await checkFfmpeg();
  await checkModel(modelPath);
}
