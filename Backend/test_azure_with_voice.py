#!/usr/bin/env python3
"""
Test Azure STT with actual voice recording from microphone
This simulates what the frontend does:
1. Record audio from microphone
2. Send to /api/transcribe
3. Get transcript back
"""
import requests
import pyaudio
import wave
import io
import time

def record_audio(duration=5):
    """Record audio from microphone for specified duration"""
    CHUNK = 1024
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 16000
    
    print(f"\n🎤 Recording for {duration} seconds...")
    print("📢 SPEAK NOW: Say 'Hello, my name is John and I am testing the interview system'")
    
    p = pyaudio.PyAudio()
    
    try:
        stream = p.open(format=FORMAT,
                       channels=CHANNELS,
                       rate=RATE,
                       input=True,
                       frames_per_buffer=CHUNK)
        
        frames = []
        
        for i in range(0, int(RATE / CHUNK * duration)):
            data = stream.read(CHUNK)
            frames.append(data)
            if i % 10 == 0:
                print(".", end="", flush=True)
        
        print("\n✅ Recording complete!")
        
        stream.stop_stream()
        stream.close()
        
        # Save to WAV in memory
        wav_buffer = io.BytesIO()
        wf = wave.open(wav_buffer, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        wav_buffer.seek(0)
        return wav_buffer.getvalue()
        
    finally:
        p.terminate()

def test_transcribe(audio_data):
    """Send audio to /api/transcribe endpoint"""
    url = "http://localhost:8000/api/transcribe"
    
    files = {'audio': ('recording.wav', io.BytesIO(audio_data), 'audio/wav')}
    
    print("\n📤 Sending audio to Azure STT endpoint...")
    print(f"   Audio size: {len(audio_data)} bytes")
    
    try:
        response = requests.post(url, files=files, timeout=30)
        print(f"   Status: {response.status_code}")
        
        result = response.json()
        print("\n📝 Response:")
        print(f"   Transcript: '{result.get('transcript', '')}'")
        if result.get('error'):
            print(f"   Error: {result.get('error')}")
        if result.get('confidence'):
            print(f"   Confidence: {result.get('confidence')}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    print("=" * 60)
    print("Azure Speech-to-Text Test - Live Voice Recording")
    print("=" * 60)
    
    try:
        # Record audio
        audio_data = record_audio(duration=5)
        
        # Test transcription
        result = test_transcribe(audio_data)
        
        if result and result.get('transcript'):
            print("\n✅ SUCCESS! Azure STT is working!")
            print(f"   You said: '{result['transcript']}'")
        else:
            print("\n⚠️  No speech detected or error occurred")
            
    except KeyboardInterrupt:
        print("\n\n❌ Test cancelled by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
