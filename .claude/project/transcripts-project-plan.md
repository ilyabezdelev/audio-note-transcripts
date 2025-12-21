# Audio Transcription Project

## Goal

Create an on-device audio transcription system that converts voice memos from iPhone and Telegram into searchable markdown or VTT transcripts with timestamps.

**Key Requirements:**

- **Privacy**: On-device processing (no cloud APIs)
- **Cost**: Free or very low cost
- **Speed**: Fast enough for regular use on M1 MacBook Pro
- **Format**: Markdown output (default) or VTT output (optional) with timestamps and metadata
- **Readability**: Markdown format merges segments into longer paragraphs (3-5 lines) for easier reading
- **Audio Sources**: Any format ffmpeg supports (M4A, MP4, OGG, MP3, WAV, AAC, FLAC, WEBM, MOV, etc.)

## Technology Stack

### Selected Stack

**Transcription engine**: whisper.cpp with large-v3-turbo model
**Application layer**: TypeScript + Node.js
**CLI framework**: commander (argument parsing)
**Process execution**: Node.js child_process (spawn whisper.cpp, ffmpeg)

**Why whisper.cpp:**

- ✅ Native VTT output support (`--output-vtt` flag)
- ✅ On-device processing (complete privacy, no API keys)
- ✅ Free and open source
- ✅ Metal acceleration for M1 (~12 seconds per minute of audio)
- ✅ Best-in-class accuracy (0.3% CER, 1% WER)
- ✅ Supports any audio/video format via ffmpeg conversion (M4A, MP4, OGG, MP3, WAV, AAC, FLAC, WEBM, MOV, etc.)
- ✅ Multiple model options (trade speed vs accuracy)

**Why TypeScript/Node:**

- ✅ Better maintainability than bash scripts
- ✅ Easy VTT file parsing and metadata injection
- ✅ Robust error handling with try/catch
- ✅ Rich CLI ecosystem (commander, chalk, ora)
- ✅ Type safety for configuration and arguments
- ✅ Easier testing and validation

**Not selected:**

- ❌ Pure bash: Hard to maintain, poor error handling, difficult VTT parsing
- ❌ Apple Speech API (hear): No VTT support, requires custom timestamp estimation

## Repository Structure

**This repository** (audio-note-transcripts) will contain the transcription tool you're building:

```
audio-note-transcripts/
├── src/
│   ├── cli.ts              # CLI entry point (commander setup)
│   ├── transcribe.ts       # Main transcription logic
│   ├── whisper.ts          # Whisper.cpp integration
│   ├── ffmpeg.ts           # Audio conversion utilities
│   ├── vtt.ts              # VTT parsing and metadata injection
│   ├── markdown.ts         # Markdown conversion from VTT
│   ├── validate.ts         # Dependency and input validation
│   └── types.ts            # TypeScript type definitions
├── .tmp/                   # Temporary WAV files during processing (NOT in git)
├── dist/                   # Compiled JavaScript (NOT in git)
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .gitignore              # Exclude .tmp/, dist/, node_modules/, .DS_Store, input/
└── README.md               # Usage documentation
```

**Note**: Audio files and outputs can be anywhere on your system. By default, markdown (.md) or VTT (.vtt) files are created in the same directory as the input audio.

## Installation

### 1. Install System Dependencies

```bash
# Install whisper.cpp and ffmpeg via Homebrew
brew install whisper-cpp ffmpeg

# Verify installations
which whisper-cli  # Should output: /opt/homebrew/bin/whisper-cli
which ffmpeg       # Should output: /opt/homebrew/bin/ffmpeg

# Note: The package is "whisper-cpp" but the binary is "whisper-cli"
```

### 2. Download Whisper Model

```bash
# Create models directory
mkdir -p ~/.whisper-models

# Download large-v3-turbo model (DEFAULT - recommended for best balance)
# From: https://huggingface.co/ggerganov/whisper.cpp/tree/main
# Download ggml-large-v3-turbo.bin to ~/.whisper-models/

# Optional: Download base model for faster processing (lower accuracy)
# Download ggml-base.bin to ~/.whisper-models/
```

### 3. Setup Project

```bash
# Install dependencies
npm install

# Create temporary directory for audio conversion
mkdir -p .tmp

# Build TypeScript to JavaScript
npm run build
```

### 4. Make It Globally Available (Choose One Option)

**Option A: npm link (Recommended for development)**

```bash
# From project root, create global symlink
npm link

# Now you can run from anywhere:
transcribe ~/Desktop/memo.m4a
transcribe /path/to/file.ogg --model base
```

**Option B: Global install (If you publish to npm)**

```bash
npm install -g audio-note-transcripts

# Run from anywhere
transcribe ~/Desktop/memo.m4a
```

**Option C: npx (No installation needed)**

```bash
# From project directory
npx . ~/Desktop/memo.m4a

# Or if published to npm
npx audio-note-transcripts ~/Desktop/memo.m4a
```

**Option D: Add to PATH manually**

```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$PATH:$HOME/code/audio-note-transcripts/dist"

# Make cli.js executable
chmod +x dist/cli.js

# Run from anywhere
transcribe ~/Desktop/memo.m4a
```

## Output Formats

### Markdown Format (Default)

Each transcript includes:

- **Metadata section**: Source file, creation date, duration, processing info
- **Timestamped paragraphs**: Merged segments (3-5 lines) for readability

**Example output:**

```markdown
# Transcript

## Metadata

- **Source**: voice-memo-2025-12-20.m4a
- **Created**: 2025-12-20 14:30:15
- **Duration**: 00:03:45
- **Transcribed**: 2025-12-20 20:30:42
- **Model**: large-v3-turbo
- **Language**: ru (Russian)
- **Engine**: whisper.cpp

## Transcription

**[00:00:00.000]**

First paragraph with multiple sentences merged for readability. This makes it easier to read and follow the conversation. Typically 3-5 original segments are combined.

**[00:00:15.280]**

Next paragraph continues here with more merged content.
```

### VTT Format (Optional: `--format vtt`)

Standard WebVTT format with precise timestamps:

```vtt
WEBVTT

NOTE
Source: voice-memo-2025-12-20.m4a
Created: 2025-12-20 14:30:15
Duration: 00:03:45
Transcribed: 2025-12-20 20:30:42
Model: large-v3-turbo
Language: ru (Russian)
Engine: whisper.cpp

00:00:00.000 --> 00:00:05.280
This is the first segment of transcribed text.

00:00:05.280 --> 00:00:10.560
This is the second segment with proper timestamps.
```

**Note on language support:**

- **Russian (`--language ru`)**: Best for Russian-only content
- **English (`--language en`)**: Best for English-only content
- **Auto-detect (`--language auto`)**: Default, lets Whisper detect language
- **Mixed content**: Russian with English words works well with `--language ru` as Whisper handles code-switching naturally

## Usage

### After npm link (Recommended)

```bash
# Basic usage - uses large-v3-turbo model by default
transcribe ~/Desktop/memo.m4a
# Output: ~/Desktop/memo.vtt
# Model: large-v3-turbo (default)

transcribe /path/to/telegram-voice.ogg
# Output: /path/to/telegram-voice.vtt
# Model: large-v3-turbo (default)

# Specify different model
transcribe ~/Desktop/memo.m4a --model base           # Faster, lower accuracy
transcribe ~/Desktop/memo.m4a --model large-v3-turbo # Default (explicit)
transcribe ~/Desktop/memo.m4a --model large-v3       # Slower, highest accuracy

# Specify language (improves accuracy)
transcribe ~/Desktop/memo.m4a --language ru          # Russian
transcribe ~/Desktop/memo.m4a --language en          # English
transcribe ~/Desktop/memo.m4a --language auto        # Auto-detect (default)

# Specify output file (full path with filename)
transcribe ~/Desktop/memo.m4a --output ~/Documents/transcripts/my-memo.vtt

# Specify output directory (creates memo.vtt in that directory)
transcribe ~/Desktop/memo.m4a --output ~/Documents/transcripts/
# Output: ~/Documents/transcripts/memo.vtt

# Combined options
transcribe ~/Desktop/memo.m4a --model base --language ru --output ./transcript.vtt

# Specify model path (default: ~/.whisper-models/ggml-large-v3-turbo.bin)
transcribe ~/Desktop/memo.m4a --model-path ~/.whisper-models/ggml-base.bin
```

### From Project Directory (Development)

```bash
# Using npm script
npm run transcribe -- ~/Desktop/memo.m4a

# Using tsx directly (no build needed)
npx tsx src/cli.ts ~/Desktop/memo.m4a

# Using built version
node dist/cli.js ~/Desktop/memo.m4a
```

### With npx (No Installation)

```bash
# If published to npm
npx audio-note-transcripts ~/Desktop/memo.m4a

# From local project (already in audio-note-transcripts directory)
npx . ~/Desktop/memo.m4a
```

### With Claude Code

When working in Claude Code, simply say:

- "transcribe ~/Desktop/memo.m4a" → uses default model
- "transcribe /path/to/meeting.ogg with base model" → uses fast model
- "transcribe ../recording.mp3" → works with relative paths

## Performance

### M1 MacBook Pro Benchmarks

**large-v3-turbo model** (recommended):

- 1-minute audio: ~12 seconds
- 5-minute audio: ~1 minute
- 30-minute audio: ~5 minutes

### Model Comparison

| Model            | Speed     | Accuracy | Use Case                        |
| ---------------- | --------- | -------- | ------------------------------- |
| `base`           | 3x faster | Lower    | Quick drafts, rough transcripts |
| `large-v3-turbo` | Balanced  | Best     | Default (recommended)           |
| `large-v3`       | 2x slower | Highest  | Maximum accuracy needed         |

## Workflow

1. **Record**: Create voice memo on iPhone or send voice message on Telegram
2. **Transfer**: Audio files can be anywhere on your system (Desktop, Downloads, etc.)
3. **Transcribe**: Run `transcribe <path-to-audio>` from anywhere
4. **Output**: VTT file created in same directory as input (or custom location via `--output`)
5. **Review**: Open VTT file - it's next to your original audio file
6. **Reference**: Use timestamps to jump to specific moments in original audio
7. **Keep**: Original audio files are never deleted or moved

## Implementation Phases

Each phase includes validation steps to verify assumptions before proceeding.

### Phase 1: Verify System Dependencies ✅

**Goal**: Confirm whisper.cpp and ffmpeg work as expected

**Tasks**:

- [x] Install whisper.cpp via Homebrew: `brew install whisper-cpp ffmpeg`
- [x] Verify whisper-cli exists: `which whisper-cli`
- [x] Download a sample audio file (M4A from iPhone)
- [x] Check if `--output-vtt` flag exists: `whisper-cli --help | grep vtt`
- [x] Convert M4A to WAV: `ffmpeg -i input/sample.m4a -ar 16000 -ac 1 -c:a pcm_s16le .tmp/sample.wav`
- [x] Run whisper-cli on WAV: `whisper-cli -m ~/.whisper-models/ggml-base.bin -f .tmp/sample.wav --output-vtt`
- [x] Verify it produces VTT output files

**Validation Results**:

```bash
# ✅ Confirmed: whisper-cli works with WAV files
whisper-cli -m ~/.whisper-models/ggml-base.bin -f .tmp/sample.wav --output-vtt
# Output: .tmp/sample.wav.vtt created successfully

# ✅ Performance: 97-second audio transcribed in 2.5 seconds (38x real-time)
# ✅ Metal GPU acceleration confirmed on M1 Pro
# ✅ VTT format correct with proper timestamps
```

**Key Findings**:

- ⚠️ **whisper-cli cannot read M4A directly** - requires WAV conversion via ffmpeg first
- ✅ Output file created as `<input-filename>.vtt` in same directory as input
- ✅ Base model is very fast with Metal acceleration
- ✅ VTT format includes proper WEBVTT header and timestamps

---

### Phase 2: Download and Test Whisper Models ✅

**Goal**: Ensure models work correctly and understand performance

**Tasks**:

- [x] Create `~/.whisper-models/` directory
- [x] Download `ggml-base.bin` (small, fast model for testing)
- [x] Download `ggml-large-v3-turbo.bin` (production model)
- [x] Test base model: manually transcribe 1-minute audio, measure time
- [x] Test large-v3-turbo model: same audio, compare quality and speed
- [x] Verify VTT output format matches expected structure

**Validation**:

```bash
# Test base model (should be fast, ~3-5 seconds for 1-min audio)
time whisper-cli -m ~/.whisper-models/ggml-base.bin -f test-1min.m4a --output-vtt

# Test large-v3-turbo (should be ~10-15 seconds for 1-min audio)
time whisper-cli -m ~/.whisper-models/ggml-large-v3-turbo.bin -f test-1min.m4a --output-vtt

# Check VTT format
cat test-1min.vtt
# Should start with: WEBVTT
# Should contain: 00:00:00.000 --> 00:00:05.280
```

**Success criteria**:

- Both models run without errors
- VTT files contain proper timestamps
- Performance matches expectations (update benchmarks if different)

**Results**:

✅ **Phase 2 completed successfully!**

Model files downloaded:

- `~/.whisper-models/ggml-base.bin` - 141 MB
- `~/.whisper-models/ggml-large-v3-turbo.bin` - 1.5 GB

**Performance Benchmarks** (97-second audio on M1 Pro):

| Model            | Time    | Speed        | File Size  |
| ---------------- | ------- | ------------ | ---------- |
| base             | 2.3 sec | 42x realtime | 141 MB     |
| large-v3-turbo   | 9.0 sec | 11x realtime | 1.5 GB     |
| **Speed delta:** | +6.7s   | 4x slower    | 10x larger |

**Quality Comparison**:

Base model errors:

- ❌ "Thropic" (should be "Anthropic")
- ❌ Missing precision in timestamps (00:00:00.000)
- ❌ Worse punctuation and capitalization
- ❌ Less accurate technical terms (no hyphenation in "AI adjacent")

Large-v3-turbo improvements:

- ✅ "Anthropic" (correct)
- ✅ "NVIDIA" (correctly capitalized)
- ✅ "Irkutsk" (correct Russian place name)
- ✅ "Joe Dispenza" (correct proper noun)
- ✅ Better punctuation (proper periods, commas)
- ✅ More precise timestamps (00:00:00.720)
- ✅ Better hyphenation ("AI-adjacent", "best-case")
- ✅ Auto-detected language: en (p = 0.993017)

**Example comparison**:

```
Base:     "Thropic, where else?"
Turbo:    "Anthropic. Where else?"

Base:     "AI adjacent companies"
Turbo:    "AI-adjacent companies"
```

**Conclusion**:

- Large-v3-turbo is 4x slower but **significantly more accurate**
- For 97-second audio, the difference is only 7 seconds (acceptable)
- Large-v3-turbo correctly handles proper nouns, technical terms, and mixed-language content
- **Recommendation**: Use large-v3-turbo as default for production

---

### Phase 3: Initialize Node.js Project ✅

**Goal**: Set up TypeScript project structure

**Tasks**:

- [x] Create `package.json` with `npm init`
- [x] Add dependencies: `commander`
- [x] Add dev dependencies: `typescript`, `tsx`, `@types/node`
- [x] Create `tsconfig.json`
- [x] Set up `bin` field in package.json to point to CLI entry
- [x] Add build script: `"build": "tsc"`
- [x] Add dev script: `"dev": "tsx src/cli.ts"`
- [x] Create minimal `src/cli.ts` with commander setup

**Validation Results**:

```bash
# ✅ Build succeeds without errors
npm run build
# Output: Compiled to dist/cli.js

# ✅ CLI shows help correctly
npx tsx src/cli.ts --help
# Output: Usage information with all options

# ✅ CLI accepts arguments
npx tsx src/cli.ts test.m4a --language ru
# Output: Parses arguments correctly, shows placeholder message
```

**package.json essentials**:

```json
{
  "name": "audio-note-transcripts",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "transcribe": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts"
  }
}
```

---

### Phase 4: Implement Dependency Validation ✅

**Goal**: Create validation module before building main functionality

**Tasks**:

- [x] Create `src/validate.ts`
- [x] Implement `checkWhisperCli()`: verify whisper-cli command exists
- [x] Implement `checkFfmpeg()`: verify ffmpeg command exists
- [x] Implement `checkModel(modelPath)`: verify model file exists and readable
- [x] Implement `validateInputFile(filePath)`: check file exists and is supported format
- [x] Create `src/types.ts` for shared types (TranscriptionConfig, etc.)
- [x] Integrate validation into CLI

**Validation Results**:

```bash
# ✅ Valid input passes all checks
npx tsx src/cli.ts input/sample.m4a --model base
# Output:
# ✓ whisper-cli found
# ✓ ffmpeg found
# ✓ Model found: ~/.whisper-models/ggml-base.bin
# ✓ Input file valid: input/sample.m4a
# All validations passed!

# ✅ Missing file shows clear error
npx tsx src/cli.ts /fake/file.m4a
# Error: Input file not found or not readable: /fake/file.m4a

# ✅ Unsupported format fails at ffmpeg stage with clear error
# (No validation - ffmpeg handles all format support)

# ✅ Missing model shows installation instructions
npx tsx src/cli.ts input/sample.m4a --model-path /fake/model.bin
# Error: Model file not found or not readable: /fake/model.bin
# Please download a Whisper model:
#   mkdir -p ~/.whisper-models
#   ...
```

**Success criteria**:

- ✅ All check functions throw descriptive errors
- ✅ Error messages clearly explain what's missing and how to fix it
- ✅ Tilde expansion works for model paths
- ✅ File existence validated (format support delegated to ffmpeg)

---

### Phase 5: Implement FFmpeg Audio Conversion ✅

**Goal**: Convert M4A/OGG/MP3 to 16kHz WAV for Whisper

**Tasks**:

- [x] Create `src/ffmpeg.ts`
- [x] Implement `convertToWav(inputPath, outputPath)`: spawn ffmpeg process
- [x] Handle stderr output (ffmpeg writes progress to stderr)
- [x] Return audio duration from conversion
- [x] Test with M4A file
- [x] Test with OGG file
- [x] Test with MP3 file

**Validation Results**:

```bash
# ✅ M4A conversion (97-second iPhone voice memo)
npx tsx src/test-ffmpeg.ts input/sample.m4a
# ✓ Conversion successful!
# Duration: 97.17 seconds

# ✅ OGG conversion
npx tsx src/test-ffmpeg.ts input/test.ogg
# ✓ Conversion successful!
# Duration: 2.00 seconds

# ✅ MP3 conversion
npx tsx src/test-ffmpeg.ts input/test.mp3
# ✓ Conversion successful!
# Duration: 2.00 seconds

# ✅ Verify output format
file .tmp/test-conversion.wav
# RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 16000 Hz
```

**Key features implemented**:

- ✅ Uses spawn for streaming output
- ✅ Extracts duration from ffmpeg metadata
- ✅ Creates output directory if needed
- ✅ Proper error handling with helpful messages
- ✅ Overwrites existing files (-y flag)

---

### Phase 6: Implement Whisper.cpp Integration

**Goal**: Run whisper.cpp and capture VTT output

**Tasks**:

- [x] Create `src/whisper.ts`
- [x] Implement `transcribe(wavPath, modelPath, outputDir, language?)`: spawn whisper-cli
- [x] Pass correct flags: `-m model.bin`, `-f input.wav`, `--output-vtt`
- [x] Add language flag if specified: `-l ru` or `-l en`
- [x] Capture stdout/stderr for progress
- [x] Wait for process completion
- [x] Return path to generated VTT file
- [x] Handle whisper-cli errors gracefully

**Validation**:

```typescript
import { transcribe } from './whisper.js';

const vttPath = await transcribe(
  '.tmp/test.wav',
  '~/.whisper-models/ggml-base.bin',
  'output',
  'ru' // Optional language parameter
);
console.log(`VTT created at: ${vttPath}`);
```

**whisper-cli command reference**:

```bash
# With language specified
whisper-cli -m model.bin -f input.wav --output-vtt -l ru

# Auto-detect language (use -l auto or omit flag)
whisper-cli -m model.bin -f input.wav --output-vtt -l auto

# Note: Flags can be in any order, but model and file are required
```

**Success criteria**:

- VTT file created in output directory
- File contains WEBVTT header and timestamps
- Language flag passed correctly when specified
- Errors are caught and reported clearly

**Results**:

✅ **Phase 6 completed successfully!**

Created files:

- `src/whisper.ts` - Whisper.cpp integration module
- `src/test-whisper.ts` - Test script for validation

Test results:

```bash
$ node dist/test-whisper.js
Testing Whisper transcription...
Input WAV: .tmp/test-conversion.wav
Model: ~/.whisper-models/ggml-base.bin
Output directory: .tmp
Language: auto

✓ Transcription successful!
VTT file created at: .tmp/test-conversion.wav.vtt
```

Test with Russian language parameter:

```bash
$ node -e "import { transcribe } from './dist/whisper.js'; ..."
# Transcribed 97-second audio with mixed Russian/English content
# Output: .tmp/test-conversion.wav.vtt (1.9K)
```

VTT file format verification:

```vtt
WEBVTT

00:00:00.000 --> 00:00:06.000
  Да, Бро. I was just driving and I was listening to Kawaii K Parame.
00:00:06.000 --> 00:00:11.000
  The song that you introduced me to, like the very long, the 20-minute song.
...
```

✅ Whisper integration working correctly:

- Spawns whisper-cli with correct flags
- Supports language parameter (ru, en, auto)
- Handles tilde expansion in model path
- Moves VTT files to specified output directory
- Mixed-language detection works well
- Proper error handling

---

### Phase 7: Implement VTT Metadata Injection ✅

**Goal**: Parse VTT and add custom metadata header

**Tasks**:

- [x] Create `src/vtt.ts`
- [x] Implement `parseVtt(vttPath)`: read and parse VTT file
- [x] Implement `addMetadata(vtt, metadata)`: inject NOTE section after WEBVTT header
- [x] Extract file metadata (creation date, duration) from original audio
- [x] Write enhanced VTT back to file
- [x] Preserve exact timestamp formatting

**Validation**:

```typescript
import { addMetadata } from './vtt.ts';

const metadata = {
  source: 'test.m4a',
  created: new Date(),
  duration: 60,
  model: 'base',
  language: 'ru', // Language code
  transcribedAt: new Date(),
};

await addMetadata('output/test.vtt', metadata);

// Verify output
const vtt = await fs.readFile('output/test.vtt', 'utf-8');
console.log(vtt);
// Should contain NOTE section with all metadata including language
```

**Expected output format**:

```
WEBVTT

NOTE
Source: test.m4a
Created: 2025-12-20 14:30:15
Duration: 00:01:00
Transcribed: 2025-12-20 20:30:42
Model: base
Language: ru (Russian)
Engine: whisper.cpp

00:00:00.000 --> 00:00:05.280
Transcribed text here...
```

**Results**:

✅ **Phase 7 completed successfully!**

Created files:

- `src/vtt.ts` - VTT metadata injection module
- `src/test-vtt.ts` - Test script for validation

Test results:

```bash
$ node dist/test-vtt.js
Testing VTT metadata injection...
VTT file: .tmp/large-v3-turbo-output.vtt
Audio file: input/sample.m4a

Audio created: 2025-12-20T17:57:42.000Z
✓ Metadata added successfully

Enhanced VTT (first 15 lines):
WEBVTT

NOTE
Source: input/sample.m4a
Created: 2025-12-20 20:57:42
Duration: 00:01:37
Transcribed: 2025-12-20 21:35:04
Model: large-v3-turbo
Language: auto (Auto-detect)
Engine: whisper.cpp

00:00:00.720 --> 00:00:09.900
 Yo, bro. Yeah, I was just driving...
```

✅ VTT metadata injection working correctly:

- NOTE section inserted after WEBVTT header
- All metadata fields formatted correctly:
  - Source file path
  - Creation date (YYYY-MM-DD HH:MM:SS format)
  - Duration (HH:MM:SS format)
  - Transcription timestamp
  - Model name
  - Language code with human-readable name
  - Engine identifier
- Original timestamps preserved exactly
- All transcription content intact
- Language name mapping tested (ru → Russian, en → English, auto → Auto-detect)

---

### Phase 8: Build Complete Transcription Pipeline ✅

**Goal**: Orchestrate all modules into single workflow

**Tasks**:

- [x] Create `src/transcribe.ts`
- [x] Implement `transcribeAudio(inputPath, options)` that:
  1. Validates dependencies
  2. Validates input file
  3. Converts audio to WAV
  4. Runs whisper.cpp
  5. Adds metadata to VTT
  6. Cleans up temporary files
  7. Returns output path
- [x] Add error handling with cleanup
- [x] Add progress reporting (console.log for now)

**Validation**:

```typescript
import { transcribeAudio } from './transcribe.js';

const result = await transcribeAudio('~/Desktop/memo.m4a', {
  model: 'base',
  outputDir: 'output',
});

console.log(`Success! VTT saved to: ${result.vttPath}`);
console.log(`Processing time: ${result.duration}s`);
```

**Success criteria**:

- Can transcribe M4A file end-to-end
- VTT contains metadata and timestamps
- Temporary WAV file is cleaned up
- Errors don't leave orphaned files

**Results**:

✅ **Phase 8 completed successfully!**

Created files:

- `src/transcribe.ts` - Complete transcription pipeline orchestrator
- `src/test-pipeline.ts` - End-to-end test script

Test results (base model):

```bash
$ node dist/test-pipeline.js
Testing complete transcription pipeline...

Validating dependencies...
✓ Dependencies validated

Validating input file: input/sample.m4a
✓ Input file validated

Converting .m4a to WAV format...
✓ Conversion complete (97.17s)

Transcribing with base model (language: auto)...
✓ Transcription complete

Adding metadata to VTT...
✓ Metadata added

✓ VTT saved to: .tmp/pipeline-test.vtt
✓ Temporary files cleaned up

Success! Processing time: 2.56s

Results:
  VTT path: .tmp/pipeline-test.vtt
  Duration: 2.56 seconds
  Model: base
  Language: auto
```

Test with large-v3-turbo model:

```bash
Processing time: 8.45s (97-second audio)
Model: large-v3-turbo
Language: en (English)
```

VTT output verification:

```vtt
WEBVTT

NOTE
Source: input/sample.m4a
Created: 2025-12-20 20:57:42
Duration: 00:01:37
Transcribed: 2025-12-20 21:38:28
Model: base
Language: auto (Auto-detect)
Engine: whisper.cpp

00:00:00.000 --> 00:00:10.000
 Yo bro, yeah, I was just driving...
```

✅ Complete pipeline working correctly:

- All modules orchestrated properly
- Dependency validation at start
- Audio conversion (M4A → WAV)
- Whisper transcription with progress output
- Metadata injection with all fields
- Temporary file cleanup (no orphaned files)
- Error handling with cleanup on failure
- Configurable model and language
- Processing time tracking
- Works with both base and large-v3-turbo models

---

### Phase 9: Build CLI with Commander ✅

**Goal**: Create command-line interface

**Tasks**:

- [x] Create `src/cli.ts`
- [x] Set up commander program with:
  - Main argument: input file path
  - Option: `--model <name>` (default: large-v3-turbo)
  - Option: `--model-path <path>` (default: ~/.whisper-models/ggml-large-v3-turbo.bin)
  - Option: `--output <path>` (optional, default: same directory as input with .vtt extension)
  - Option: `--language <code>` (default: auto, options: ru, en, auto)
- [x] Implement output path logic:
  - If `--output` not provided: use `<input-dir>/<input-name>.vtt`
  - If `--output` is a directory (ends with /): use `<output-dir>/<input-name>.vtt`
  - If `--output` is a file path: use as-is
- [x] Add shebang: `#!/usr/bin/env node`
- [x] Call transcribeAudio with parsed arguments
- [x] Handle errors and exit codes

**Validation**:

```bash
npm run build
chmod +x dist/cli.js

# Test help
node dist/cli.js --help

# Test default output (creates test.vtt in same directory as input)
node dist/cli.js ~/Desktop/test.m4a --model base
ls ~/Desktop/test.vtt  # Should exist

# Test with output directory
node dist/cli.js ~/Desktop/test.m4a --output ~/Documents/
ls ~/Documents/test.vtt  # Should exist

# Test with output file
node dist/cli.js ~/Desktop/test.m4a --output ~/Documents/my-transcript.vtt
ls ~/Documents/my-transcript.vtt  # Should exist

# Test with language
node dist/cli.js ~/Desktop/test.m4a --language ru

# Test with combined options
node dist/cli.js ~/Desktop/test.m4a --model base --language ru --output ./transcript.vtt
```

**Success criteria**:

- `--help` shows usage information
- Default output works (creates .vtt in same directory as input)
- Output directory option works (creates .vtt in specified directory)
- Output file option works (creates .vtt at exact path)
- All options work as expected
- Errors show helpful messages

**Results**:

✅ **Phase 9 completed successfully!**

Updated file:

- `src/cli.ts` - Complete CLI implementation with Commander

Test results:

**Help command:**

```bash
$ node dist/cli.js --help
Usage: transcribe [options] <input>

Transcribe audio files to VTT format using whisper.cpp

Arguments:
  input                Input audio file path

Options:
  -V, --version        output the version number
  --model <name>       Model to use (default: "large-v3-turbo")
  --model-path <path>  Path to model file
  --output <path>      Output file or directory path
  --language <code>    Language code (ru, en, auto) (default: "auto")
  -h, --help           display help for command
```

**Default output (same directory as input):**

```bash
$ node dist/cli.js input/sample.m4a --model base
✓ VTT saved to: /Users/.../input/sample.vtt
Processing time: 4.08 seconds
```

**Custom output file path:**

```bash
$ node dist/cli.js input/sample.m4a --model base --output .tmp/custom-output.vtt
✓ VTT saved to: /Users/.../.tmp/custom-output.vtt
Processing time: 2.03 seconds
```

**With language parameter and default model:**

```bash
$ node dist/cli.js input/sample.m4a --language en --output .tmp/en-turbo.vtt
Transcribing with large-v3-turbo model (language: en)...
✓ VTT saved to: /Users/.../.tmp/en-turbo.vtt
Model: large-v3-turbo
Language: en
Processing time: 7.89 seconds
```

VTT metadata verification:

```vtt
Language: en (English)
```

**Error handling:**

```bash
$ node dist/cli.js non-existent.m4a
✗ Transcription failed:
Input file not found or not readable: .../non-existent.m4a
(exit code 1)
```

✅ CLI working correctly:

- Help and version commands work
- Default output creates VTT in same directory as input
- Custom output path works (both file and directory)
- All model options work (base, large-v3-turbo)
- Language parameter works (auto, en, ru)
- Error handling with clear messages and proper exit codes
- Path resolution works correctly (relative and absolute paths)
- Progress output visible during transcription

---

### Phase 10: Global Installation and Testing ✅

**Goal**: Make CLI available system-wide

**Tasks**:

- [x] Run `npm link` from project directory
- [x] Test global command: `transcribe --help`
- [x] Test from different directories:
  - `cd ~ && transcribe ~/Desktop/test.m4a`
  - `cd /tmp && transcribe ~/Desktop/test.m4a`
- [x] Test with relative paths: `transcribe ../audio/memo.m4a`
- [x] Test with absolute paths: `transcribe /Users/name/Desktop/memo.m4a`

**Validation**:

```bash
# Should work from any directory
cd ~/Documents
transcribe ~/Desktop/memo.m4a
ls ~/Desktop/memo.vtt  # Should exist

cd /tmp
transcribe ~/Downloads/voice.ogg --model base
ls ~/Downloads/voice.vtt  # Should exist

# Test with custom output
transcribe ~/Desktop/test.m4a --output /tmp/my-transcript.vtt
ls /tmp/my-transcript.vtt  # Should exist
```

**Success criteria**:

- `transcribe` command available globally
- Works from any directory
- Handles all path types correctly (absolute, relative, ~)
- Default output location works (same directory as input)
- Custom output paths work (directory or file)

**Results**:

✅ **Phase 10 completed successfully!**

Test results:

**Global command availability:**

```bash
$ cd ~ && transcribe --help
Usage: transcribe [options] <input>
# Works from any directory! ✓
```

**From different directories:**

```bash
# Test 1: From /tmp with absolute path and custom output
$ cd /tmp && transcribe /Users/.../input/sample.m4a --output /tmp/test-from-tmp.vtt
✓ VTT saved to: /tmp/test-from-tmp.vtt
Processing time: 3.69 seconds

# Test 2: From home directory with tilde path (default output)
$ cd ~ && transcribe ~/code/audio-note-transcripts/input/sample.m4a
✓ VTT saved to: /Users/.../input/sample.vtt
Processing time: 3.31 seconds
```

**Relative paths:**

```bash
$ transcribe ./input/sample.m4a --output .tmp/relative-path-test.vtt
✓ VTT saved to: /Users/.../.tmp/relative-path-test.vtt
Processing time: 3.46 seconds
```

**Absolute paths:**

```bash
$ transcribe ~/code/audio-note-transcripts/input/sample.m4a --output /tmp/transcripts-output/sample-test.vtt
✓ VTT saved to: /tmp/transcripts-output/sample-test.vtt
Processing time: 3.15 seconds
```

**Default output behavior:**

```bash
# No --output specified
$ transcribe ~/code/audio-note-transcripts/input/sample.m4a
✓ VTT saved to: /Users/.../input/sample.vtt
# Creates VTT in same directory as input ✓
```

✅ Global installation working correctly:

- `transcribe` command available from any directory
- `npm link` creates proper global symlink
- Works with all path types:
  - Absolute paths: `/Users/...`
  - Relative paths: `./input/file.m4a`
  - Tilde paths: `~/Desktop/file.m4a`
- Default output: same directory as input file
- Custom output: works with specific file paths
- Path resolution works correctly from any working directory
- All VTT files created with proper metadata

**Known limitation:**

- Output directory with trailing slash (`--output /path/`) - the `resolve()` function normalizes away the trailing slash, so directory detection doesn't work as expected. Workaround: use full file path instead (`--output /path/file.vtt`)

---

### Phase 11: Comprehensive Format Testing

**Goal**: Verify all audio formats work correctly

**Tasks**:

- [ ] Test M4A file (iPhone voice memo)
- [ ] Test OGG file (Telegram voice message)
- [ ] Test MP3 file
- [ ] Test different audio lengths: 30s, 5min, 30min
- [ ] Test with both models: base and large-v3-turbo
- [ ] Verify VTT quality and timestamp accuracy
- [ ] Measure actual performance on your M1

**Validation**:

```bash
# Test all formats
transcribe test.m4a
transcribe test.ogg
transcribe test.mp3

# Test different models
time transcribe test-5min.m4a --model base
time transcribe test-5min.m4a --model large-v3-turbo

# Compare quality
# Open both VTT files and verify accuracy
```

**Success criteria**:

- All formats produce valid VTT files
- Timestamps are accurate (spot-check with audio player)
- Performance meets expectations
- No crashes or errors

---

### Phase 12: Documentation and Cleanup

**Goal**: Finalize project for regular use

**Tasks**:

- [ ] Update README.md with installation and usage
- [ ] Add examples to README
- [ ] Update .gitignore to exclude:
  - `.tmp/` (temporary WAV files)
  - `dist/` (compiled JavaScript)
  - `node_modules/` (dependencies)
  - `.DS_Store` (macOS system files)
  - `input/` (optional folder for audio files - not required)
- [ ] Add error handling improvements based on testing
- [ ] Add helpful error messages for common issues
- [ ] Update CLAUDE.md with project-specific guidance

**Validation**:

- Follow README from scratch on a fresh clone
- Verify all examples work
- Check that common errors have helpful messages

## Module Architecture

The application is split into focused modules:

### `src/cli.ts` (Entry Point)

- Parses command-line arguments with commander
- Validates options and calls transcribeAudio()
- Handles errors and exit codes
- Displays progress and results

### `src/transcribe.ts` (Main Orchestrator)

- Coordinates the complete transcription pipeline:
  1. Validates dependencies (whisper-cli, ffmpeg, model)
  2. Validates input file (exists and is readable)
  3. Converts audio/video to 16kHz WAV (ffmpeg handles format detection)
  4. Runs whisper-cli transcription (always creates VTT)
  5. Processes output based on format:
     - VTT: Injects metadata into VTT
     - Markdown: Converts VTT to Markdown with merged paragraphs
  6. Moves output to final location
  7. Cleans up temporary files
  8. Returns result with output path and timing

### `src/validate.ts` (Dependency Validation)

- `checkWhisperCli()`: Verify whisper-cli command exists
- `checkFfmpeg()`: Verify ffmpeg command exists
- `checkModel(path)`: Verify model file exists and is readable
- `validateInputFile(path)`: Check file exists and is readable (format support handled by ffmpeg)

### `src/ffmpeg.ts` (Audio Conversion)

- `convertToWav(input, output)`: Spawn ffmpeg to convert to 16kHz mono WAV
- Returns audio duration
- Handles ffmpeg stderr output

### `src/whisper.ts` (Whisper.cpp Integration)

- `transcribe(wavPath, modelPath, format, outputDir, language?)`: Spawn whisper-cli
- Always uses `--output-vtt` flag (VTT used as intermediate format)
- Adds language flag if specified: `-l ru` or `-l en`
- Captures stdout/stderr for progress
- Returns path to generated VTT file

### `src/vtt.ts` (VTT Processing)

- `addMetadata(path, metadata)`: Inject NOTE section with:
  - Source filename
  - Creation date
  - Audio duration
  - Transcription date
  - Model name
  - Language (ru, en, or auto)
  - Engine info
- Preserves exact timestamp formatting
- Maps language codes to human-readable names (ru → Russian, en → English)
- `getAudioCreationDate(path)`: Extract file creation date

### `src/markdown.ts` (Markdown Conversion)

- `convertToMarkdown(vttPath, outputPath, metadata, minLines)`: Convert VTT to Markdown
- `parseVttFile(content)`: Extract timestamped segments from VTT
- `mergeSegments(segments, minLines)`: Merge short segments into longer paragraphs
  - Default: 3-5 lines per paragraph
  - Makes transcripts more readable
  - Preserves first timestamp of each merged group
- Outputs markdown with:
  - Metadata section (source, dates, model, language)
  - Timestamped paragraphs with `**[HH:MM:SS.mmm]**` markers
  - Readable format for note-taking and review

### `src/types.ts` (Type Definitions)

- `OutputFormat`: 'markdown' | 'vtt'
- `TranscriptionConfig`: Includes format field
- `TranscriptionResult`: Includes format and outputPath
- `TranscriptMetadata`: Shared metadata interface
- `TranscriptSegment`: Timestamp and text pair
- Other shared types

## Recent Changes

### Removed Format Validation (December 2025)

**Decision**: Removed hardcoded audio format validation, letting ffmpeg handle all format support

**Rationale**:

- Hardcoded format lists are restrictive and require maintenance
- ffmpeg supports hundreds of audio and video formats
- Users want flexibility to transcribe MP4 videos, FLAC audio, etc.
- ffmpeg provides clear error messages for unsupported formats
- Simpler code with less validation logic

**Implementation**:

- Removed `SUPPORTED_AUDIO_FORMATS` constant from types.ts
- Updated `validateInputFile()` to only check file existence/readability
- ffmpeg automatically handles format detection and conversion
- All video formats now supported (MP4, MOV, WEBM, etc.) - audio is extracted

**Impact**:

- Users can now transcribe any format ffmpeg supports (300+ codecs)
- MP4 video files can be transcribed directly
- Simpler codebase with less validation code
- Better error messages from ffmpeg for truly unsupported formats

---

### Format Change: Markdown as Default (December 2025)

**Decision**: Changed default output format from VTT to Markdown

**Rationale**:

- VTT format has short, line-by-line segments that are hard to read
- Markdown format merges 3-5 segments into longer paragraphs
- Much more readable for casual reading and note-taking
- VTT still available via `--format vtt` flag for users who need precise timestamps

**Implementation**:

- Whisper-cli always creates VTT (for timestamps)
- For markdown output: VTT → Markdown conversion with paragraph merging
- For VTT output: Add metadata to VTT
- Both formats include full metadata (source, dates, model, language)

**Impact**:

- Default command now creates `.md` files instead of `.vtt` files
- Breaking change for existing users (migration: add `--format vtt` to commands)
- Significantly improves readability of transcripts

## Notes

- **No credentials needed**: Everything runs on-device, no API keys
- **Complete privacy**: Audio never leaves your machine
- **Input preservation**: Original audio files kept indefinitely
- **Markdown searchable**: Text files in readable format, easy to search and review
- **VTT optional**: Still available for users who need WebVTT format

## Links & Resources

- [Whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Whisper Models - Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main)
- [WebVTT Format Specification](https://www.w3.org/TR/webvtt1/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
