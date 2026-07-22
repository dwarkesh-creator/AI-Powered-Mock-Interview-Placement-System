"""
Local test script for Azure Speech Services TTS integration.

Tests:
- Azure Speech SDK availability
- API key configuration
- TTS synthesis with Rehaan voice
- WAV file generation

Usage:
    python Backend/test_tts_local.py
"""

import os
import sys
from pathlib import Path

# Add Backend to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

def test_azure_tts():
    """Test Azure TTS with Kunal voice."""
    print("=" * 70)
    print("Azure Speech Services TTS Test (Kunal Voice)")
    print("=" * 70)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(backend_dir / ".env")
    
    # Check Azure credentials
    speech_key = os.environ.get("AZURE_SPEECH_KEY")
    endpoint = os.environ.get("AZURE_SPEECH_ENDPOINT")
    voice = os.environ.get("AZURE_TTS_VOICE", "en-IN-KunalNeural")
    
    print(f"\n✓ Endpoint: {endpoint}")
    print(f"✓ Voice: {voice}")
    print(f"✓ API Key: {'*' * 20}{speech_key[-10:] if speech_key else 'NOT SET'}")
    
    if not speech_key:
        print("\n❌ ERROR: AZURE_SPEECH_KEY not set in .env file!")
        return False
    
    if not endpoint:
        print("\n❌ ERROR: AZURE_SPEECH_ENDPOINT not set in .env file!")
        return False
    
    try:
        from tts_lipsync import synthesize_interview_question
        
        test_question = "Tell me about yourself and why you're interested in this role."
        print(f"\n🎙️  Synthesizing: \"{test_question}\"")
        print("⏳ Please wait...")
        
        result = synthesize_interview_question(
            question=test_question,
            speech_key=speech_key,
            endpoint=endpoint,
            voice=voice
        )
        
        filename = result.get("filename")
        mouth_cues = result.get("mouth_cues", [])
        
        if filename:
            audio_path = backend_dir / "generated_audio" / filename
            if audio_path.exists():
                size_kb = audio_path.stat().st_size / 1024
                print(f"\n✅ SUCCESS!")
                print(f"   📁 File: {filename}")
                print(f"   📊 Size: {size_kb:.1f} KB")
                print(f"   💬 Mouth cues: {len(mouth_cues)} frames")
                print(f"\n🎵 Audio saved at:")
                print(f"   {audio_path}")
                return True
            else:
                print(f"\n❌ File was not created: {filename}")
                return False
        else:
            print("\n❌ No filename in result")
            return False
            
    except ImportError as exc:
        print(f"\n❌ Import Error: {exc}")
        print("\n💡 Run: pip install azure-cognitiveservices-speech")
        return False
    except Exception as exc:
        print(f"\n❌ TTS Error: {exc}")
        return False

if __name__ == "__main__":
    success = test_azure_tts()
    print("\n" + "=" * 70)
    sys.exit(0 if success else 1)
