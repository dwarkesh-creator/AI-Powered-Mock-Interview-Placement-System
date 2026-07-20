# AI-Powered-Mock-Interview-Placement-System
Uses NLP and LLM to analyze a user's resume and target job role (e.g., Software Engineer, Data Scientist) to generate personalized, context-aware interview questions ranging from behavioral to deep technical queries.

## Rhubarb Lip Sync setup

The interviewer's lip-sync feature uses the standalone Rhubarb CLI; the binary is intentionally not committed. Download the Windows ZIP from the [official Rhubarb Lip Sync releases page](https://github.com/DanielSWolf/rhubarb-lip-sync/releases), extract it under `Backend/bin/rhubarb/`, and confirm that `rhubarb.exe` exists somewhere inside that folder. Start the FastAPI backend normally afterwards. Generated question WAV files are written to `Backend/generated_audio/` and are also ignored by Git.

The backend uses Gemini TTS by default. Optional environment settings are `GEMINI_TTS_MODEL` (default `gemini-3.1-flash-tts-preview`) and `GEMINI_TTS_VOICE` (default `Sadaltager`). The default prompt asks for a knowledgeable, professional adult Indian-English male interviewer voice.
