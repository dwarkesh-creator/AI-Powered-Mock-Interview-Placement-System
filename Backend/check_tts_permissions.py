"""Check if Gemini API key has TTS permissions enabled."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

def check_tts_permissions():
    """Check if the API key can access TTS models."""
    api_key = os.getenv("GEMINI_API_KEY")
    
    print("=" * 70)
    print("CHECKING GEMINI TTS PERMISSIONS")
    print("=" * 70)
    
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY not found in .env file")
        return False
    
    print(f"✓ API Key found: {api_key[:20]}... (truncated)")
    print("\nChecking available models...")
    
    try:
        import google.genai as genai
        
        client = genai.Client(api_key=api_key)
        
        # List all models
        models_response = client.models.list()
        
        # Filter TTS models
        tts_models = []
        all_models = []
        
        for model in models_response:
            model_name = model.name
            all_models.append(model_name)
            
            if 'tts' in model_name.lower() or 'audio' in model_name.lower():
                tts_models.append(model_name)
        
        print(f"\n✓ Total models available: {len(all_models)}")
        print(f"✓ TTS models found: {len(tts_models)}")
        
        if tts_models:
            print("\n" + "=" * 70)
            print("TTS MODELS AVAILABLE:")
            print("=" * 70)
            for model in tts_models:
                print(f"  ✅ {model}")
            
            # Check if your configured model is available
            configured_model = os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
            print(f"\n" + "=" * 70)
            print(f"YOUR CONFIGURED MODEL: {configured_model}")
            print("=" * 70)
            
            if f"models/{configured_model}" in [m for m in tts_models]:
                print(f"✅ PERFECT! '{configured_model}' is available for your API key!")
                return True
            else:
                print(f"⚠️  WARNING: '{configured_model}' not found in your available models.")
                print("\nTry one of these instead:")
                for model in tts_models[:3]:
                    clean_name = model.replace("models/", "")
                    print(f"  - {clean_name}")
                return False
        else:
            print("\n" + "=" * 70)
            print("❌ NO TTS MODELS FOUND")
            print("=" * 70)
            print("\nPossible reasons:")
            print("1. Your API key doesn't have access to TTS models")
            print("2. TTS is not enabled in your Google Cloud project")
            print("3. You need to enable the Gemini API in Google AI Studio")
            print("\nTo fix:")
            print("1. Go to: https://aistudio.google.com/apikey")
            print("2. Check if your API key has 'Generative Language API' enabled")
            print("3. Try creating a new API key with all permissions")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        print("\nThis might mean:")
        print("1. Invalid API key")
        print("2. Network connection issue")
        print("3. google-genai package not installed correctly")
        return False


if __name__ == "__main__":
    success = check_tts_permissions()
    print("\n" + "=" * 70)
    if success:
        print("✅ RESULT: TTS is enabled and working!")
    else:
        print("❌ RESULT: TTS is NOT properly configured")
    print("=" * 70)
    exit(0 if success else 1)
