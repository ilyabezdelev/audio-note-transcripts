# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio note transcripts - an on-device audio transcription system that converts voice memos (iPhone, Telegram) into searchable markdown or VTT transcripts with timestamps.

**Key Features:**

- On-device processing using whisper.cpp (complete privacy, no cloud APIs)
- TypeScript + Node.js application layer
- Supports any audio/video format ffmpeg handles (M4A, MP4, OGG, MP3, WAV, etc.)
- Default markdown output with merged paragraphs for readability
- Optional VTT output with precise timestamps
- Global CLI tool: `transcribe <input-file> [options]`

**Technology Stack:**

- Transcription: whisper.cpp with large-v3-turbo model
- Runtime: Node.js + TypeScript
- CLI: Commander for argument parsing
- Audio conversion: ffmpeg

## Detailed Documentation

For complete project documentation, implementation phases, architecture details, and usage examples, see:

`.claude/project/transcripts-project-plan.md`

This comprehensive document includes:

- Full technology stack rationale
- Installation instructions
- Module architecture
- Implementation phases and validation results
- Performance benchmarks
- Output format specifications
