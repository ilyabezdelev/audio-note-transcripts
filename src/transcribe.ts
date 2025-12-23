import { mkdir, unlink } from 'fs/promises';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { basename, dirname, extname, join } from 'path';
import { convertToWav } from './ffmpeg.js';
import { convertToMarkdown } from './markdown.js';
import { TranscriptionConfig, TranscriptionResult } from './types.js';
import { checkFfmpeg, checkModel, checkWhisperCli, validateInputFile } from './validate.js';
import { addMetadata, getAudioCreationDate } from './vtt.js';
import { transcribe as runWhisper } from './whisper.js';

/**
 * Generate a short unique ID for temporary files
 * @returns 6-character alphanumeric ID
 */
function generateShortId(): string {
  const nanoid = customAlphabet(alphanumeric, 6);
  return nanoid();
}

/**
 * Clean up temporary files
 * @param tempFiles Array of temporary file paths (null values are filtered out)
 * @param showMessages Whether to log success/warning messages
 */
async function cleanupTempFiles(tempFiles: (string | null)[], showMessages = false): Promise<void> {
  const filesToCleanup = tempFiles.filter(Boolean) as string[];
  if (filesToCleanup.length === 0) {
    return;
  }

  try {
    await Promise.all(filesToCleanup.map((file) => unlink(file)));
    if (showMessages) {
      console.log('✓ Temporary files cleaned up');
    }
  } catch (error) {
    if (showMessages) {
      console.warn('Warning: Failed to clean up some temporary files:', filesToCleanup);
    }
  }
}

/**
 * Transcribe audio file to markdown or VTT format
 * @param inputPath Path to audio file (M4A, OGG, MP3, WAV)
 * @param config Transcription configuration
 * @returns Transcription result with output path and metadata
 */
export async function transcribeAudio(
  inputPath: string,
  config: TranscriptionConfig
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  let tempWavPath: string | null = null;
  let tempVttPath: string | null = null;

  try {
    // Step 1: Validate dependencies
    console.log('Validating dependencies...');
    await checkWhisperCli();
    await checkFfmpeg();
    await checkModel(config.modelPath);
    console.log('✓ Dependencies validated');
    console.log();

    // Step 2: Validate input file
    console.log(`Validating input file: ${inputPath}`);
    await validateInputFile(inputPath);
    console.log('✓ Input file validated');
    console.log();

    // Step 3: Convert audio to WAV (if not already WAV)
    const inputExt = extname(inputPath).toLowerCase();
    let wavPath: string;
    let audioDuration = 0;

    if (inputExt === '.wav') {
      console.log('Input is already WAV format, skipping conversion');
      wavPath = inputPath;
      // For WAV files, we'd need to calculate duration separately
      // For now, leave as 0 (can be improved later)
    } else {
      console.log(`Converting ${inputExt} to WAV format...`);
      const inputBasename = basename(inputPath, inputExt);
      const shortId = generateShortId();
      tempWavPath = join(process.cwd(), `${inputBasename}-${shortId}.wav`);

      audioDuration = await convertToWav(inputPath, tempWavPath);
      console.log(`✓ Conversion complete (${audioDuration.toFixed(2)}s)`);
      console.log();
      wavPath = tempWavPath;
    }

    // Step 4: Run whisper.cpp (always creates VTT)
    console.log(`Transcribing with ${config.modelName} model (language: ${config.language})...`);
    const tempOutputDir = process.cwd();
    const vttPath = await runWhisper(
      wavPath,
      config.modelPath,
      config.format,
      tempOutputDir,
      config.language
    );
    tempVttPath = vttPath; // Track for cleanup
    console.log('✓ Transcription complete');
    console.log();

    // Step 5: Add metadata and convert format if needed
    const audioCreationDate = await getAudioCreationDate(inputPath);
    const metadata = {
      source: inputPath,
      created: audioCreationDate,
      duration: audioDuration,
      model: config.modelName,
      language: config.language,
      transcribedAt: new Date(),
    };

    let processedOutputPath = vttPath;

    if (config.format === 'vtt') {
      console.log('Adding metadata to VTT...');
      await addMetadata(vttPath, metadata);
      console.log('✓ Metadata added');
      // VTT is our final output, don't track for cleanup
      tempVttPath = null;
    } else {
      // Convert VTT to Markdown
      console.log('Converting to markdown format...');
      const mdPath = vttPath.replace(/\.vtt$/, '.md');
      await convertToMarkdown(vttPath, mdPath, metadata);
      processedOutputPath = mdPath;
      console.log('✓ Markdown created');
    }
    console.log();

    // Step 6: Move output to final location if needed
    let finalOutputPath = processedOutputPath;
    const outputExtension = config.format === 'vtt' ? '.vtt' : '.md';

    if (config.outputPath) {
      const { rename } = await import('fs/promises');
      const outputPath = config.outputPath;

      // Determine final path
      if (outputPath.endsWith('/')) {
        // Output is a directory
        const outputFilename = basename(processedOutputPath);
        finalOutputPath = join(outputPath, outputFilename);
      } else {
        // Output is a file path
        finalOutputPath = outputPath;
      }

      // Ensure output directory exists
      await mkdir(dirname(finalOutputPath), { recursive: true });

      // Move output file
      await rename(processedOutputPath, finalOutputPath);
      console.log(`✓ Output saved to: ${finalOutputPath}`);
    } else {
      // Move to same directory as input
      const inputDir = dirname(inputPath);
      const inputBasename = basename(inputPath, extname(inputPath));
      finalOutputPath = join(inputDir, `${inputBasename}${outputExtension}`);

      const { rename } = await import('fs/promises');
      await mkdir(dirname(finalOutputPath), { recursive: true });
      await rename(processedOutputPath, finalOutputPath);
      console.log(`✓ Output saved to: ${finalOutputPath}`);
    }

    // Step 7: Clean up temporary files
    await cleanupTempFiles([tempWavPath, tempVttPath], true);

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    console.log();
    console.log(`Success! Processing time: ${processingTime.toFixed(2)}s`);

    return {
      outputPath: finalOutputPath,
      duration: processingTime,
      modelUsed: config.modelName,
      language: config.language,
      format: config.format,
    };
  } catch (error) {
    // Clean up temporary files on error
    await cleanupTempFiles([tempWavPath, tempVttPath]);

    // Re-throw the error
    throw error;
  }
}
