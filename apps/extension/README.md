# Tuple-GPT Extension

A Chrome extension for video subtitle management and audio transcription, supporting YouTube and Bilibili platforms.

## Features

- **Multi-platform Support**: Works with YouTube and Bilibili
- **Subtitle Management**: Extract, display, and interact with video subtitles
- **Audio Transcription**: Use Whisper API to transcribe Bilibili audio to subtitles
- **Video Summarization**: Generate AI-powered video summaries
- **Time Navigation**: Click on subtitles to jump to specific video timestamps
- **Vue 3 + TypeScript**: Modern development stack with type safety

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open Chrome and navigate to `chrome://extensions/`, enable "Developer mode", and load the unpacked extension from the `dist` directory.

4. Configure API keys in the extension options page:
   - OpenAI API Key for video summarization
   - Whisper API Key for audio transcription

5. Build for production:

```bash
npm run build
```

## Usage

### Basic Features
- Navigate to a YouTube or Bilibili video page
- The extension sidebar will automatically appear
- Click "Load Subtitles" to extract video subtitles
- Use the "Summary" tab to generate AI-powered video summaries

### Audio Transcription (Bilibili only)
1. Go to a Bilibili video page
2. Configure your Whisper API key in the extension settings
3. Click the audio transcription button (🔊 icon) in the subtitles section
4. The audio will be automatically transcribed to subtitles
5. View transcription results in the popup modal

## Project Structure

- `src/popup/` - Extension popup UI
- `src/content/` - Content scripts
- `manifest.config.ts` - Chrome extension manifest configuration

## Documentation

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Content scripts should be placed in `src/content/`
- Popup UI should be placed in `src/popup/`
