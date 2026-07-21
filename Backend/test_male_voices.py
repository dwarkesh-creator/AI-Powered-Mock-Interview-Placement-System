"""Test different male voices to find the right one"""
import os
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

print('Testing available voices for gender...\n')

# According to Gemini documentation, these are the available voices
voices = {
    'Puck': 'Young male',
    'Charon': 'Mature male', 
    'Kore': 'Young female',
    'Fenrir': 'Deep male',
    'Aoede': 'Female',
    'Orbit': 'Male',
    'Callisto': 'Female'
}

test_text = "Tell me about your experience with this project."

for voice_name, description in voices.items():
    print(f'Testing: {voice_name} ({description})')
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-tts-preview',
            contents=test_text,
            config=types.GenerateContentConfig(
                response_modalities=['AUDIO'],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name),
                    ),
                ),
            ),
        )
        print(f'  ✅ {voice_name} works!')
    except Exception as e:
        print(f'  ❌ {voice_name} failed: {e}')
    print()
