import { access, mkdir, rename, unlink } from 'fs/promises';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { basename, dirname, extname, join } from 'path';
import { convertToWav, getAudioDuration } from './ffmpeg.js';
import { convertToMarkdown } from './markdown.js';
import { convertToPodcastJson } from './podcast-json.js';
import { convertToSrt } from './srt.js';
import { TranscriptionConfig, TranscriptionResult } from './types.js';
import { checkFfmpeg, checkModel, checkWhisperCli, validateInputFile } from './validate.js';
import { getAudioCreationDate } from './vtt.js';
import { transcribe as runWhisper } from './whisper.js';
import { convertToWordJson } from './word-json.js';

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

const OUTPUT_EXTENSIONS: Record<string, string> = {
  markdown: '.md',
  vtt: '.vtt',
  'podcast-json': '.json',
  srt: '.srt',
  'word-json': '.json',
};

async function resolveOutputPath(
  inputPath: string,
  processedOutputPath: string,
  config: TranscriptionConfig
): Promise<string> {
  const outputExtension = OUTPUT_EXTENSIONS[config.format] || '.md';

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

    // Step 4: Run whisper.cpp
    const isWordLevel = config.format === 'word-json';
    log(`Transcribing with ${config.modelName} model (language: ${config.language})...`);
    const whisperOutputPath = await runWhisper(
      wavPath,
      config.modelPath,
      inputDir,
      config.language,
      config.suppressConsoleOutput,
      isWordLevel
    );
    let tempWhisperOutput: string | null = whisperOutputPath;
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

    let processedOutputPath = whisperOutputPath;

    if (config.format === 'vtt') {
      tempWhisperOutput = null;
    } else if (config.format === 'markdown') {
      log('Converting to markdown format...');
      const mdPath = whisperOutputPath.replace(/\.vtt$/, '.md');
      await convertToMarkdown(whisperOutputPath, mdPath, metadata, 3, config.suppressMetadata);
      processedOutputPath = mdPath;
      log('✓ Markdown created');
    } else if (config.format === 'podcast-json') {
      log('Converting to podcast JSON format...');
      const jsonPath = whisperOutputPath.replace(/\.vtt$/, '.json');
      await convertToPodcastJson(whisperOutputPath, jsonPath);
      processedOutputPath = jsonPath;
      log('✓ Podcast JSON created');
    } else if (config.format === 'srt') {
      log('Converting to SRT format...');
      const srtPath = whisperOutputPath.replace(/\.vtt$/, '.srt');
      await convertToSrt(whisperOutputPath, srtPath);
      processedOutputPath = srtPath;
      log('✓ SRT created');
    } else if (config.format === 'word-json') {
      log('Converting to word-level JSON format...');
      const wordJsonPath = whisperOutputPath.replace(/\.json$/, '-words.json');
      await convertToWordJson(whisperOutputPath, wordJsonPath, audioDuration, config.language);
      processedOutputPath = wordJsonPath;
      log('✓ Word-level JSON created');
    }

    // Step 6: Move output to final location
    const finalOutputPath = await resolveOutputPath(inputPath, processedOutputPath, config);
    await mkdir(dirname(finalOutputPath), { recursive: true });
    await rename(processedOutputPath, finalOutputPath);
    log(`✓ Output saved to: ${finalOutputPath}`);

    // Step 7: Clean up temporary files
    await cleanupTempFiles([tempWavPath, tempWhisperOutput], log);

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
    await cleanupTempFiles([tempWavPath]);
    throw error;
  }
}
