import { access, mkdir, rename, unlink } from 'fs/promises';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { basename, dirname, extname, join } from 'path';
import { convertToWav, getAudioDuration } from './ffmpeg.js';
import { convertToMarkdown } from './markdown.js';
import { TranscriptionConfig, TranscriptionResult } from './types.js';
import { checkFfmpeg, checkModel, checkWhisperCli, validateInputFile } from './validate.js';
import { addMetadata, getAudioCreationDate } from './vtt.js';
import { transcribe as runWhisper } from './whisper.js';

function generateShortId(): string {
  const nanoid = customAlphabet(alphanumeric, 6);
  return nanoid();
}

async function generateUniqueFilePath(
  directory: string,
  baseName: string,
  extension: string,
  maxRetries: number = 100
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const shortId = generateShortId();
    const filePath = join(directory, `${baseName}-${shortId}${extension}`);

    try {
      await access(filePath);
      continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return filePath;
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to generate unique filename after ${maxRetries} attempts. ` +
      `Please check the directory: ${directory}`
  );
}

async function cleanupTempFiles(
  tempFiles: (string | null)[],
  log: (message: string) => void = () => {}
): Promise<void> {
  const filesToCleanup = tempFiles.filter(Boolean) as string[];
  if (filesToCleanup.length === 0) return;

  try {
    await Promise.all(filesToCleanup.map((file) => unlink(file)));
    log('✓ Temporary files cleaned up');
  } catch {
    log('Warning: Failed to clean up some temporary files');
  }
}

async function resolveOutputPath(
  inputPath: string,
  processedOutputPath: string,
  config: TranscriptionConfig
): Promise<string> {
  const outputExtension = config.format === 'vtt' ? '.vtt' : '.md';

  if (config.outputPath) {
    if (config.outputPath.endsWith('/')) {
      return join(config.outputPath, basename(processedOutputPath));
    }
    return config.outputPath;
  }

  const inputDir = dirname(inputPath);
  const inputBasename = basename(inputPath, extname(inputPath));
  const baseOutputPath = join(inputDir, `${inputBasename}-transcript${outputExtension}`);

  try {
    await access(baseOutputPath);
    return await generateUniqueFilePath(inputDir, `${inputBasename}-transcript`, outputExtension);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return baseOutputPath;
    }
    throw error;
  }
}

export async function transcribeAudio(
  inputPath: string,
  config: TranscriptionConfig
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  const log = config.log ?? (() => {});
  let tempWavPath: string | null = null;
  let tempVttPath: string | null = null;

  try {
    // Step 1: Validate dependencies
    log('Validating dependencies...');
    await checkWhisperCli();
    await checkFfmpeg();
    await checkModel(config.modelPath);
    log('✓ Dependencies validated');

    // Step 2: Validate input file
    log(`Validating input file: ${inputPath}`);
    await validateInputFile(inputPath);
    log('✓ Input file validated');

    // Step 3: Convert audio to WAV (if not already WAV)
    const inputExt = extname(inputPath).toLowerCase();
    const inputDir = dirname(inputPath);
    let wavPath: string;
    let audioDuration = 0;

    if (inputExt === '.wav') {
      log('Input is already WAV format, skipping conversion');
      wavPath = inputPath;
      audioDuration = await getAudioDuration(inputPath);
    } else {
      log(`Converting ${inputExt} to WAV format...`);
      const inputBasename = basename(inputPath, inputExt);
      tempWavPath = await generateUniqueFilePath(inputDir, inputBasename, '.wav');
      audioDuration = await convertToWav(inputPath, tempWavPath);
      log(`✓ Conversion complete (${audioDuration.toFixed(2)}s)`);
      wavPath = tempWavPath;
    }

    // Step 4: Run whisper.cpp (always creates VTT)
    log(`Transcribing with ${config.modelName} model (language: ${config.language})...`);
    const vttPath = await runWhisper(
      wavPath,
      config.modelPath,
      inputDir,
      config.language,
      config.suppressConsoleOutput
    );
    tempVttPath = vttPath;
    log('✓ Transcription complete');

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
      log('Adding metadata to VTT...');
      await addMetadata(vttPath, metadata);
      log('✓ Metadata added');
      tempVttPath = null;
    } else {
      log('Converting to markdown format...');
      const mdPath = vttPath.replace(/\.vtt$/, '.md');
      await convertToMarkdown(vttPath, mdPath, metadata, 3, config.suppressMetadata);
      processedOutputPath = mdPath;
      log('✓ Markdown created');
    }

    // Step 6: Move output to final location
    const finalOutputPath = await resolveOutputPath(inputPath, processedOutputPath, config);
    await mkdir(dirname(finalOutputPath), { recursive: true });
    await rename(processedOutputPath, finalOutputPath);
    log(`✓ Output saved to: ${finalOutputPath}`);

    // Step 7: Clean up temporary files
    await cleanupTempFiles([tempWavPath, tempVttPath], log);

    const processingTime = (Date.now() - startTime) / 1000;
    log(`Success! Processing time: ${processingTime.toFixed(2)}s`);

    return {
      outputPath: finalOutputPath,
      duration: processingTime,
      modelUsed: config.modelName,
      language: config.language,
      format: config.format,
    };
  } catch (error) {
    await cleanupTempFiles([tempWavPath, tempVttPath]);
    throw error;
  }
}
