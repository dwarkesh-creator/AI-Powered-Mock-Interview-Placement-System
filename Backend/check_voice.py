import os
from dotenv import load_dotenv
load_dotenv()
from tts_lipsync import DEFAULT_TTS_VOICE

print(f'Default voice in code: {DEFAULT_TTS_VOICE}')
print(f'Voice from .env: {os.getenv("GEMINI_TTS_VOICE", "Not set")}')
print(f'\n✅ Voice will be: {os.getenv("GEMINI_TTS_VOICE") or DEFAULT_TTS_VOICE}')
