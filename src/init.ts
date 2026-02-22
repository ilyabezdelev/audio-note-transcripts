import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';
import { mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import cliProgress from 'cli-progress';
import { join } from 'path';
import {
  MODELS_DIR,
  AVAILABLE_MODELS,
  getInstalledModels,
  getModelDownloadUrl,
  formatFileSize,
  type AvailableModel,
} from './models.js';
import { checkWhisperCli, checkFfmpeg } from './validate.js';

async function checkDependencies(): Promise<void> {
  console.log('Checking dependencies...');

  try {
    await checkWhisperCli();
    console.log('  whisper-cli    installed');
  } catch {
    console.error('  whisper-cli    MISSING — install with: brew install whisper-cpp');
    process.exit(1);
  }

  try {
    await checkFfmpeg();
    console.log('  ffmpeg         installed');
  } catch {
    console.error('  ffmpeg         MISSING — install with: brew install ffmpeg');
    process.exit(1);
  }

  console.log();
}

async function selectModels(): Promise<AvailableModel[]> {
  const installed = getInstalledModels();
  const installedNames = new Set(installed.map((m) => m.name));

  console.log('Available whisper models:');
  console.log();

  const selectable: AvailableModel[] = [];
  let index = 1;

  for (const model of AVAILABLE_MODELS) {
    if (installedNames.has(model.name)) {
      console.log(
        `  [installed]  ${model.name.padEnd(20)} ${model.sizeDescription.padEnd(10)} ${model.description}`
      );
    } else {
      console.log(
        `  [${index}]          ${model.name.padEnd(20)} ${model.sizeDescription.padEnd(10)} ${model.description}`
      );
      selectable.push(model);
      index++;
    }
  }

  console.log();

  if (selectable.length === 0) {
    console.log('All models are already installed.');
    return [];
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question('Enter model numbers to download (comma-separated), or "all": ');

    const trimmed = answer.trim().toLowerCase();
    if (!trimmed || trimmed === 'none' || trimmed === 'q') {
      return [];
    }
    if (trimmed === 'all') {
      return selectable;
    }

    const indices = trimmed.split(',').map((s) => parseInt(s.trim(), 10));
    const selected: AvailableModel[] = [];
    for (const i of indices) {
      if (i >= 1 && i <= selectable.length) {
        selected.push(selectable[i - 1]);
      } else {
        console.warn(`  Skipping invalid selection: ${i}`);
      }
    }
    return selected;
  } finally {
    rl.close();
  }
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body received');
  }

  const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);

  const bar = new cliProgress.SingleBar({
    format: '  [{bar}] {percentage}% | {downloaded}/{total} | ETA: {eta_formatted}',
    barCompleteChar: '#',
    barIncompleteChar: '-',
    hideCursor: true,
  });

  bar.start(totalBytes, 0, {
    downloaded: '0 MB',
    total: formatFileSize(totalBytes),
  });

  const fileStream = createWriteStream(destPath);
  const reader = response.body.getReader();
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(value);
      downloadedBytes += value.length;
      bar.update(downloadedBytes, {
        downloaded: formatFileSize(downloadedBytes),
      });
    }
  } catch (error) {
    bar.stop();
    fileStream.close();
    await unlink(destPath).catch(() => {});
    throw error;
  }

  bar.stop();
  fileStream.end();
  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

async function downloadModels(models: AvailableModel[]): Promise<void> {
  await mkdir(MODELS_DIR, { recursive: true });

  for (const model of models) {
    console.log();
    console.log(`Downloading ${model.name} (${model.sizeDescription})...`);

    const url = getModelDownloadUrl(model.filename);
    const destPath = join(MODELS_DIR, model.filename);

    await downloadFile(url, destPath);
    console.log(`  Saved to ${destPath}`);
  }
}

export async function runInit(): Promise<void> {
  console.log('transcribe init');
  console.log('===============');
  console.log();

  await checkDependencies();

  const modelsToDownload = await selectModels();
  if (modelsToDownload.length === 0) {
    return;
  }

  await downloadModels(modelsToDownload);

  console.log();
  console.log('Setup complete! You can now run:');
  console.log('  transcribe <audio-file>');
}
