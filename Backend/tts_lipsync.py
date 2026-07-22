"""Azure Speech Services TTS file generation plus optional Rhubarb mouth-cue extraction."""
from __future__ import annotations
import json
import os
import subprocess
import tempfile
import uuid
import warnings
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parent
GENERATED_AUDIO_DIR = BACKEND_DIR / "generated_audio"
RHUBARB_DIR = BACKEND_DIR / "bin" / "rhubarb"

# Azure TTS defaults
DEFAULT_TTS_VOICE = "en-IN-RehaanNeural"  # Indian English male voice

PCM_SAMPLE_RATE = 24_000
PCM_CHANNELS = 1
PCM_SAMPLE_WIDTH = 2

VALID_VISEMES = frozenset({"A", "B", "C", "D", "E", "F", "G", "H", "X"})


class AudioSynthesisError(RuntimeError):
    """Raised when Azure Speech cannot produce a usable WAV file."""


class LipSyncError(RuntimeError):
    """Raised when Rhubarb cannot generate valid mouth cues."""


def ensure_generated_audio_directory() -> Path:
    GENERATED_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    return GENERATED_AUDIO_DIR


def get_generated_audio_path(filename: str) -> Optional[Path]:
    """Resolve a public WAV filename without permitting directory traversal."""
    safe_name = Path(filename).name
    if safe_name != filename or Path(safe_name).suffix.lower() != ".wav":
        return None
    return ensure_generated_audio_directory() / safe_name


def _find_rhubarb_binary() -> Optional[Path]:
    if not RHUBARB_DIR.exists():
        return None
    binary_name = "rhubarb.exe" if __import__("os").name == "nt" else "rhubarb"
    matches = list(RHUBARB_DIR.rglob(binary_name))
    return matches[0] if matches else None


def _generate_audio_azure(question: str, speech_key: str, region: str, voice: str) -> bytes:
    """Generate audio using Azure Speech Services."""
    try:
        import azure.cognitiveservices.speech as speechsdk
    except ImportError as exc:
        raise AudioSynthesisError(
            "Azure Speech SDK not installed. Run: pip install azure-cognitiveservices-speech"
        ) from exc
    
    # Configure Azure Speech with region (simpler and more reliable than endpoint)
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=region)
    speech_config.speech_synthesis_voice_name = voice
    
    # Set output format to WAV (Riff24Khz16BitMonoPcm includes WAV header)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
    )
    
    # Synthesize to in-memory stream (audio_config=None means in-memory)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    
    # Synthesize text
    result = synthesizer.speak_text_async(question).get()
    
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        # audio_data already contains complete WAV file with header
        return result.audio_data
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        error_msg = f"Azure TTS failed: {cancellation_details.reason}"
        if cancellation_details.error_details:
            error_msg += f" - {cancellation_details.error_details}"
        raise AudioSynthesisError(error_msg)
    else:
        raise AudioSynthesisError(f"Azure TTS returned unexpected result: {result.reason}")


def _write_wav(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(PCM_CHANNELS)
        wav_file.setsampwidth(PCM_SAMPLE_WIDTH)
        wav_file.setframerate(PCM_SAMPLE_RATE)
        wav_file.writeframes(pcm)


def generate_mouth_cues(audio_path: Path, dialog: str) -> List[Dict[str, Any]]:
    """Run Rhubarb against a WAV and return only validated JSON mouth cues."""
    rhubarb = _find_rhubarb_binary()
    if rhubarb is None:
        raise LipSyncError(
            "Rhubarb binary was not found. Install it under Backend/bin/rhubarb/."
        )
    
    with tempfile.TemporaryDirectory(dir=str(ensure_generated_audio_directory())) as temp_dir:
        temp_path = Path(temp_dir)
        dialog_path = temp_path / "dialog.txt"
        output_path = temp_path / "mouth-cues.json"
        
        dialog_path.write_text(dialog, encoding="utf-8")
        
        result = subprocess.run(
            [
                str(rhubarb),
                "--exportFormat", "json",
                "--dialogFile", str(dialog_path),
                "--output", str(output_path),
                "--quiet",
                str(audio_path),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=45,
            check=False,
        )
        
        if result.returncode != 0 or not output_path.exists():
            message = result.stderr.strip() or "Rhubarb did not create a cue file."
            raise LipSyncError(message)
        
        try:
            payload = json.loads(output_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise LipSyncError("Rhubarb produced unreadable JSON output.") from exc
    
    raw_cues = payload.get("mouthCues") if isinstance(payload, dict) else None
    if not isinstance(raw_cues, list):
        raise LipSyncError("Rhubarb JSON did not include mouthCues.")
    
    cues: List[Dict[str, Any]] = []
    for cue in raw_cues:
        if not isinstance(cue, dict):
            continue
        try:
            start = round(float(cue["start"]), 3)
            end = round(float(cue["end"]), 3)
        except (KeyError, TypeError, ValueError):
            continue
        value = str(cue.get("value", "")).upper()
        if start >= 0 and end >= start and value in VALID_VISEMES:
            cues.append({"start": start, "end": end, "value": value})
    
    if not cues:
        raise LipSyncError("Rhubarb returned no valid mouth cues.")
    
    return cues


def synthesize_interview_question(
    question: str,
    speech_key: Optional[str] = None,
    region: Optional[str] = None,
    voice: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a saved Azure TTS WAV and attach Rhubarb cues when available."""
    import time
    
    # Get Azure credentials from environment if not provided
    speech_key = speech_key or os.environ.get("AZURE_SPEECH_KEY")
    region = region or os.environ.get("AZURE_SPEECH_REGION")
    voice = voice or os.environ.get("AZURE_TTS_VOICE", DEFAULT_TTS_VOICE)
    
    if not speech_key:
        raise AudioSynthesisError(
            "Azure Speech key is required. Set AZURE_SPEECH_KEY environment variable."
        )
    
    if not region:
        raise AudioSynthesisError(
            "Azure Speech region is required. Set AZURE_SPEECH_REGION environment variable."
        )
    
    clean_question = " ".join(str(question or "").split())
    if not clean_question:
        raise AudioSynthesisError("Question text is required for speech synthesis.")
    
    last_error: Optional[Exception] = None
    # Try 3 times with backoff
    for attempt in range(3):
        try:
            if attempt > 0:
                # Backoff: wait 2s, then 4s
                time.sleep(2 ** attempt)
            
            audio_data = _generate_audio_azure(clean_question, speech_key, region, voice)
            if not audio_data:
                raise AudioSynthesisError("Azure TTS returned an empty audio response.")
            break
        except Exception as exc:
            last_error = exc
            warnings.warn(f"TTS attempt {attempt + 1}/3 failed: {exc}", RuntimeWarning)
    else:
        raise AudioSynthesisError(f"Azure TTS failed after 3 attempts. Last error: {last_error}") from last_error
    
    filename = f"interview-question-{uuid.uuid4().hex}.wav"
    audio_path = ensure_generated_audio_directory() / filename
    
    # Azure returns complete WAV file, just write it directly
    audio_path.write_bytes(audio_data)
    
    try:
        mouth_cues = generate_mouth_cues(audio_path, clean_question)
    except (LipSyncError, subprocess.TimeoutExpired) as exc:
        warnings.warn(f"Rhubarb lip-sync unavailable for {filename}: {exc}", RuntimeWarning)
        mouth_cues = []
    
    return {"filename": filename, "mouth_cues": mouth_cues}
