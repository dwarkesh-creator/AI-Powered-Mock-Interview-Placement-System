# AI-Powered-Mock-Interview-Placement-System

Uses NLP and LLM to analyze a user's resume and target job role (e.g., Software Engineer, Data Scientist) to generate personalized, context-aware interview questions ranging from behavioral to deep technical queries.

## ✨ Features

- **3D Talking Avatar Interviewer** with photorealistic lip-sync, sentiment-driven expressions, and webcam-based eye tracking
- **Gemini TTS** for natural question delivery with Rhubarb Lip Sync integration
- **Real-time speech recognition** and visual confidence analysis
- **Sentiment-aware feedback** that adapts interviewer expressions to candidate performance
- **Privacy-focused** eye tracking (all processing client-side, no data sent to servers)
- **Automatic fallbacks** to 2D avatar if WebGL unavailable

## 3D Avatar Setup

The system features a photorealistic 3D avatar with:
- Phonetically accurate lip-sync driven by Rhubarb visemes
- Sentiment expressions (confident/neutral/hesitant/struggling)
- Webcam-based eye contact tracking
- Natural idle behaviors (blinking, breathing)

### Quick Start

1. Place your `model_with_visemes.glb` file in `Frontend/public/models/`
2. Optimize for web delivery:
   ```bash
   cd Frontend
   npm run optimize-avatar
   ```
3. Start the frontend — the avatar loads automatically

**📖 Full documentation:** See [docs/3D-AVATAR-SETUP.md](docs/3D-AVATAR-SETUP.md) for:
- Avatar model requirements (Oculus visemes + ARKit blendshapes)
- Troubleshooting guide
- Performance optimization tips
- Browser compatibility matrix

## Rhubarb Lip Sync setup

The interviewer's lip-sync feature uses the standalone Rhubarb CLI; the binary is intentionally not committed. Download the Windows ZIP from the [official Rhubarb Lip Sync releases page](https://github.com/DanielSWolf/rhubarb-lip-sync/releases), extract it under `Backend/bin/rhubarb/`, and confirm that `rhubarb.exe` exists somewhere inside that folder. Start the FastAPI backend normally afterwards. Generated question WAV files are written to `Backend/generated_audio/` and are also ignored by Git.

The backend uses Gemini TTS by default. Optional environment settings are `GEMINI_TTS_MODEL` (default `gemini-3.1-flash-tts-preview`) and `GEMINI_TTS_VOICE` (default `Sadaltager`). The default prompt asks for a knowledgeable, professional adult Indian-English male interviewer voice.
