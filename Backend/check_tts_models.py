"""Check available TTS models for your Gemini API key."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

def check_tts_models():
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env")
        return
    
    print("=" * 60)
    print("Checking TTS Models Available for Your API Key")
    print("=" * 60)
    print(f"API Key: {api_key[:20]}...")
    print()
    
    try:
        import google.genai as genai
        
        client = genai.Client(api_key=api_key)
        
        # List all models
        print("Fetching available models...")
        models_response = client.models.list()
        
        # Filter TTS models
        tts_models = []
        for model in models_response:
            model_name = model.name if hasattr(model, 'name') else str(model)
            if 'tts' in model_name.lower() or 'audio' in model_name.lower():
                tts_models.append(model_name)
        
        print(f"\n✅ Found {len(tts_models)} TTS models:\n")
        for model in tts_models:
            print(f"  • {model}")
        
        if not tts_models:
            print("⚠️  No TTS models found. Your API key might not have TTS access.")
            print("\nAll models available:")
            for model in models_response:
                model_name = model.name if hasattr(model, 'name') else str(model)
                print(f"  • {model_name}")
        
        # Test TTS with current settings
        print("\n" + "=" * 60)
        print("Testing Current TTS Configuration")
        print("=" * 60)
        
        tts_model = os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
        tts_voice = os.getenv("GEMINI_TTS_VOICE", "Charon")
        
        print(f"TTS Model: {tts_model}")
        print(f"TTS Voice: {tts_voice}")
        
        print("\nAttempting to generate test audio...")
        
        from google.genai import types
        
        response = client.models.generate_content(
            model=tts_model,
            contents="Hello, this is a test.",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=tts_voice),
                    ),
                ),
            ),
        )
        
        print("✅ TTS generation successful!")
        print("Your configuration is working correctly.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"Message: {e}")
        
        if "404" in str(e) or "not found" in str(e).lower():
            print("\n💡 This model might not exist or your API key doesn't have access to it.")
            print("Try using: gemini-2.5-flash-preview-tts")
        elif "permission" in str(e).lower() or "access" in str(e).lower():
            print("\n💡 Your API key might not have TTS permissions enabled.")
            print("Check: https://aistudio.google.com/apikey")


if __name__ == "__main__":
    check_tts_models()
