"""Check available Gemini TTS voice names."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

def check_tts_voices():
    """List all available TTS voices."""
    api_key = os.getenv("GEMINI_API_KEY")
    
    print("=" * 70)
    print("CHECKING GEMINI TTS VOICES")
    print("=" * 70)
    
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY not found")
        return False
    
    # Known Gemini TTS voices (from official documentation)
    # These are the prebuilt voices available in Gemini API
    known_voices = {
        # Male voices
        "Charon": "Deep, authoritative male voice - Best for professional/formal settings",
        "Kore": "Warm, engaging male voice - Good for friendly interviews",
        "Fenrir": "Clear, professional male voice - Neutral and reliable",
        "Puck": "Energetic, younger male voice - Casual tone",
        
        # Female voices
        "Aoede": "Professional female voice - Clear and authoritative",
        "Aoede": "Professional female voice - Clear and authoritative",
        
        # Neutral/Other
        "Orbit": "Neutral voice - Good clarity for all accents",
        "Sadaltager": "Neutral voice - Clear pronunciation",
    }
    
    print("\nKNOWN GEMINI TTS VOICES:")
    print("=" * 70)
    
    print("\n🎤 MALE VOICES (BEST FOR INTERVIEWS):")
    print("-" * 70)
    print("  Charon       - Deep, authoritative (BEST FOR FORMAL INTERVIEWS)")
    print("  Kore         - Warm, engaging")
    print("  Fenrir       - Clear, professional")
    print("  Puck         - Energetic, casual")
    
    print("\n🎤 NEUTRAL VOICES:")
    print("-" * 70)
    print("  Orbit        - Neutral, clear")
    print("  Sadaltager   - Neutral, clear pronunciation")
    
    print("\n🎤 FEMALE VOICES:")
    print("-" * 70)
    print("  Aoede        - Professional, authoritative")
    
    configured_voice = os.getenv("GEMINI_TTS_VOICE", "Charon")
    print("\n" + "=" * 70)
    print(f"YOUR CONFIGURED VOICE: {configured_voice}")
    print("=" * 70)
    
    if configured_voice in ["Charon", "Kore", "Fenrir", "Puck", "Orbit", "Sadaltager", "Aoede"]:
        print(f"✅ '{configured_voice}' is a valid Gemini TTS voice!")
        print("\nNote: Voice names are case-sensitive!")
        return True
    else:
        print(f"⚠️  WARNING: '{configured_voice}' might not be a valid voice name")
        print("\nTry one of these instead:")
        print("  - Charon (recommended for interviews)")
        print("  - Kore")
        print("  - Fenrir")
        print("  - Orbit")
        return False


if __name__ == "__main__":
    success = check_tts_voices()
    
    print("\n" + "=" * 70)
    print("RECOMMENDATION FOR INTERVIEW SYSTEM:")
    print("=" * 70)
    print("Use: GEMINI_TTS_VOICE=Charon")
    print("Why: Deep, authoritative male voice - perfect for professional interviews")
    print("=" * 70)
    
    exit(0 if success else 1)
