"""Quick test to check if Gemini TTS works with your API key"""
import os
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ No GEMINI_API_KEY found in .env")
    exit(1)

print(f"✓ API Key found: {api_key[:10]}...")

client = genai.Client(api_key=api_key)

# Test 1: Try the default TTS model
print("\n📝 Testing Gemini TTS...")
try:
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",  # Use Gemini 2.0
        contents="Say hello",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck"),
                ),
            ),
        ),
    )
    print("✅ TTS SUCCESS! Audio was generated.")
    print(f"   Response type: {type(response)}")
    
except Exception as e:
    print(f"❌ TTS FAILED: {e}")
    print("\nTrying to list available models...")
    try:
        for model in client.models.list():
            if 'flash' in model.name.lower() or 'tts' in model.name.lower():
                print(f"   - {model.name}")
    except:
        pass
