# audio-note-transcripts

Transcribe audio files to readable markdown or VTT format using whisper.cpp with on-device processing.

Convert voice memos (M4A from iPhone), voice messages (OGG from Telegram), and MP3 files into searchable transcripts with timestamps and metadata.

## Features

- **On-device processing** - Complete privacy, no cloud APIs
- **Fast transcription** - Metal GPU acceleration on M1/M2 Macs
- **Multiple formats** - M4A, OGG, MP3, WAV support
- **Markdown output** - Default format with longer, readable paragraphs (3-5 lines)
- **VTT support** - Optional WebVTT format with precise timestamps
- **Podcast JSON** - Podcasting 2.0 transcript format with float-second timestamps
- **SRT subtitles** - SubRip format for broad compatibility
- **Word-level JSON** - Per-word timestamps and confidence scores via whisper.cpp
- **Configurable models** - Choose between speed (base) or accuracy (large-v3-turbo)
- **Language support** - Auto-detect or specify language (en, ru, etc.)

## Requirements

- macOS (M1/M2 for GPU acceleration, Intel also supported)
- Node.js 18+
- Homebrew

## Installation

### 1. Install System Dependencies

```bash
# Install whisper.cpp and ffmpeg via Homebrew
brew install whisper-cpp ffmpeg
```

### 2. Download Whisper Model

```bash
# Create models directory
mkdir -p ~/.whisper-models

# Download large-v3-turbo model (recommended, 1.5GB)
# From: https://huggingface.co/ggerganov/whisper.cpp/tree/main
# Download ggml-large-v3-turbo.bin to ~/.whisper-models/

# Optional: Download base model for faster processing (141MB)
# Download ggml-base.bin to ~/.whisper-models/
```

Direct download links:

- [ggml-large-v3-turbo.bin](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin) (1.5GB)
- [ggml-base.bin](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin) (141MB)

### 3. Install CLI Tool

```bash
# Clone this repository
git clone https://github.com/yourusername/audio-note-transcripts
cd audio-note-transcripts

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (makes 'transcribe' command available system-wide)
npm link
```

### 4. Verify Installation

```bash
# Test the command
transcribe --help

# Should output:
# Usage: transcribe [options] <input>
# Transcribe audio files to VTT format using whisper.cpp
```

## Usage

### Basic Usage

```bash
# Transcribe with default settings (markdown format, large-v3-turbo model, auto language)
transcribe ~/Desktop/recording.m4a

# Output: ~/Desktop/recording-transcript.md (created in same directory)

# If you run it again, it won't overwrite:
# Second run: ~/Desktop/recording-transcript-a1b2c3.md (with unique 6-char ID)
# Third run: ~/Desktop/recording-transcript-x7y8z9.md (different unique ID)
```

### With Options

```bash
# Use faster base model
transcribe ~/Desktop/recording.m4a --model base

# Specify language
transcribe ~/Desktop/recording.m4a --language en

# Output VTT format instead of markdown
transcribe ~/Desktop/recording.m4a --format vtt

# Podcast-compatible JSON transcript
transcribe ~/Desktop/recording.m4a --format podcast-json

# SRT subtitles
transcribe ~/Desktop/recording.m4a --format srt

# Word-level timestamps with confidence scores
transcribe ~/Desktop/recording.m4a --format word-json

# Custom output location
transcribe ~/Desktop/recording.m4a --output ~/Documents/transcript.md

# Combine options
transcribe ~/Desktop/recording.m4a --model base --language ru --format vtt --output ./transcript.vtt
```

### All Options

```
Options:
  -V, --version               output the version number
  --model <name>              Model to use (default: "large-v3-turbo")
  --model-path <path>         Path to model file (default: ~/.whisper-models/ggml-{model}.bin)
  --output <path>             Output file path (default: same directory as input with -transcript suffix)
  --language <code>           Language code: ru, en, auto, etc. (default: "auto")
  --format <type>             Output format: markdown, vtt, podcast-json, srt, word-json (default: "markdown")
  --suppress-metadata         Suppress metadata and timestamps in markdown output
  --suppress-console-output   Suppress whisper-cpp console output during transcription
  -h, --help                  display help for command
```

### Supported Audio Formats

This tool supports any audio or video format that ffmpeg can read, including:

- `.m4a` - iPhone voice memos
- `.mp4` - Video files (audio will be extracted)
- `.ogg` - Telegram voice messages
- `.mp3` - General audio files
- `.wav` - Uncompressed audio
- `.aac`, `.flac`, `.webm`, `.mov`, and many more

If ffmpeg can decode it, this tool can transcribe it.

## Performance

Benchmarks on M1 MacBook Pro with 97-second audio file:

| Model          | Time    | Speed        | Quality |
| -------------- | ------- | ------------ | ------- |
| base           | 2.3 sec | 42x realtime | Good    |
| large-v3-turbo | 9.0 sec | 11x realtime | Best    |

**Recommendation:** Use `large-v3-turbo` (default) for best quality. The extra 7 seconds is worth it for proper nouns, punctuation, and technical terms.

## Output Formats

### Markdown Format (Default)

Readable format with longer paragraphs (3-5 lines merged) and timestamp markers.

Use `--suppress-metadata` to output only the plain text without metadata headers or timestamps:

```markdown
# Transcript

## Metadata

- **Source**: /Users/name/Desktop/recording.m4a
- **Created**: 2025-12-20 20:57:42
- **Duration**: 00:01:37
- **Transcribed**: 2025-12-20 21:38:28
- **Model**: large-v3-turbo
- **Language**: en (English)
- **Engine**: whisper.cpp

## Transcription

**[00:00:00.720]**

First paragraph with multiple sentences merged together for readability. This makes it easier to read and follow the flow of conversation. Typically 3-5 lines are combined into one paragraph.

**[00:00:22.380]**

Next paragraph continues with more content. Each paragraph starts with a timestamp marker in bold. This format is ideal for reading and note-taking.
```

### VTT Format (Optional)

WebVTT format with precise timestamps for each segment:

```vtt
WEBVTT

NOTE
Source: /Users/name/Desktop/recording.m4a
Created: 2025-12-20 20:57:42
Duration: 00:01:37
Transcribed: 2025-12-20 21:38:28
Model: large-v3-turbo
Language: en (English)
Engine: whisper.cpp

00:00:00.720 --> 00:00:09.900
 Transcribed text appears here...

00:00:09.900 --> 00:00:22.380
 With precise timestamps for each segment.
```

### Podcast JSON Format

Podcasting 2.0 compatible transcript with float-second timestamps:

```json
{
  "version": "1.0.0",
  "segments": [
    {
      "startTime": 0.72,
      "endTime": 5.28,
      "body": "Hello and welcome to the podcast."
    },
    {
      "startTime": 5.28,
      "endTime": 10.44,
      "body": "Today we're talking about transcription."
    }
  ]
}
```

### SRT Format

SubRip subtitles with sequential numbering:

```srt
1
00:00:00,720 --> 00:00:05,280
Hello and welcome to the podcast.

2
00:00:05,280 --> 00:00:10,440
Today we're talking about transcription.
```

### Word-Level JSON Format

Per-word timestamps with confidence scores, useful for word-level highlighting and karaoke-style playback:

```json
{
  "version": "1.0.0",
  "duration": 97.17,
  "language": "en",
  "words": [
    { "word": "Hello", "start": 0.72, "end": 1.04, "probability": 0.95 },
    { "word": "and", "start": 1.04, "end": 1.18, "probability": 0.98 },
    { "word": "welcome", "start": 1.18, "end": 1.56, "probability": 0.92 }
  ]
}
```

## Examples

```bash
# iPhone voice memo (markdown output)
transcribe ~/Desktop/voice-memo.m4a
# Output: ~/Desktop/voice-memo-transcript.md

# Video file (extracts audio automatically)
transcribe ~/Desktop/presentation.mp4
# Output: ~/Desktop/presentation-transcript.md

# Telegram voice message with Russian language
transcribe ~/Downloads/voice-message.ogg --language ru
# Output: ~/Downloads/voice-message-transcript.md

# Meeting recording with VTT format
transcribe ~/Desktop/meeting.mp3 --format vtt
# Output: ~/Desktop/meeting-transcript.vtt

# Quick draft with base model
transcribe ~/Desktop/notes.m4a --model base
# Output: ~/Desktop/notes-transcript.md

# Custom output location (overrides default naming)
transcribe ~/Desktop/recording.m4a --output ~/Documents/transcripts/recording.md

# Clean text output without metadata or timestamps
transcribe ~/Desktop/recording.m4a --suppress-metadata
# Output: Plain text paragraphs only

# Quiet mode - suppress whisper-cpp console output
transcribe ~/Desktop/recording.m4a --suppress-console-output

# Both flags together for minimal output
transcribe ~/Desktop/recording.m4a --suppress-metadata --suppress-console-output
```

## How It Works

### Processing Pipeline

1. **Validation** - Checks for whisper-cli, ffmpeg, and model file
2. **Conversion** - Converts audio/video to 16kHz mono WAV using ffmpeg
3. **Transcription** - Runs whisper.cpp on the WAV file
4. **Processing** - Converts to markdown (default) or adds metadata to VTT
5. **Cleanup** - Removes temporary files automatically

### File Naming and Collision Avoidance

The CLI creates files in the **same directory as your input audio file** with smart collision avoidance:

```bash
# Example: transcribing a file on your Desktop
transcribe ~/Desktop/video.mp4

# Temporary files created in ~/Desktop/:
~/Desktop/video-a1b2c3.wav         # Temporary WAV (auto-deleted)
~/Desktop/video-a1b2c3.wav.vtt     # Temporary VTT (auto-deleted for markdown output)

# Final output (first run):
~/Desktop/video-transcript.md      # Uses -transcript suffix

# Final output (second run):
~/Desktop/video-transcript-x7y8z9.md  # Adds unique ID if file exists
```

**Output file naming:**

- Default: `{filename}-transcript.{md|vtt|json|srt}` (e.g., `recording-transcript.md`)
- If that file already exists: `{filename}-transcript-{id}.{ext}` (e.g., `recording-transcript-a1b2c3.md`)
- This prevents accidental overwrites when transcribing the same file multiple times
- Custom output path (via `--output`) always overwrites if the file exists

**Temporary file handling:**

- Temporary files use 6-character unique IDs (nanoid) to prevent collisions
- If a file with the same ID exists, a new ID is automatically generated
- Temporary files are automatically cleaned up after successful transcription
- If transcription fails, temporary files may remain in the input directory for debugging
- You can manually delete them by pattern: `rm ~/Desktop/*-??????.wav*` (6-character ID)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Format code
npm run format

# Run tests
npm test
```

## Troubleshooting

### Command not found: transcribe

Run `npm link` from the project directory.

### whisper-cli not found

Install whisper.cpp: `brew install whisper-cpp`

### Model file not found

Download the model file to `~/.whisper-models/` or specify custom path with `--model-path`.

### Transcription is slow

- Use `--model base` for 4x faster processing
- Check GPU acceleration: `whisper-cli` should show "Metal" in output
- Close other GPU-intensive applications

## Uninstall

```bash
# Remove global command
npm unlink -g

# Optionally remove models (frees ~1.6GB)
rm -rf ~/.whisper-models

# Optionally uninstall system dependencies
brew uninstall whisper-cpp ffmpeg
```

## License

MIT

## Credits

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - High-performance inference of OpenAI's Whisper
- [OpenAI Whisper](https://github.com/openai/whisper) - Original model
