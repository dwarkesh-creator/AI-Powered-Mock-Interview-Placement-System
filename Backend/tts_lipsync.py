"""Gemini TTS file generation plus optional Rhubarb mouth-cue extraction."""
from __future__ import annotations
import base64
import importlib
import json
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

DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_TTS_VOICE = "Orbit"  # Neutral male voice (best for Indian accent)

PCM_SAMPLE_RATE = 24_000
PCM_CHANNELS = 1
PCM_SAMPLE_WIDTH = 2

VALID_VISEMES = frozenset({"A", "B", "C", "D", "E", "F", "G", "H", "X"})


class AudioSynthesisError(RuntimeError):
    """Raised when Gemini cannot produce a usable WAV file."""


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


def _pcm_from_response(response: Any) -> bytes:
    try:
        data = response.candidates[0].content.parts[0].inline_data.data
    except (AttributeError, IndexError, TypeError) as exc:
        raise AudioSynthesisError("Gemini TTS returned no audio data.") from exc
    
    if isinstance(data, bytes):
        return data
    if isinstance(data, str):
        try:
            return base64.b64decode(data)
        except ValueError as exc:
            raise AudioSynthesisError("Gemini TTS returned invalid encoded audio.") from exc
    
    raise AudioSynthesisError("Gemini TTS returned audio in an unsupported format.")


def _generate_pcm(question: str, api_key: str, model: str, voice: str) -> bytes:
    genai = importlib.import_module("google.genai")
    types = importlib.import_module("google.genai.types")
    
    client = genai.Client(api_key=api_key)
    
    prompt = (
        "You are a professional Indian interviewer conducting a job interview. "
        "Speak in a clear, confident male voice with a natural Indian English accent. "
        "Use a calm, measured pace with professional interview tone - authoritative yet friendly. "
        "Pronounce each word clearly as an experienced Indian HR interviewer would. "
        "Do not add any introduction, commentary, or answer - only read the question below.\n\n"
        f"QUESTION:\n{question}"
    )
    
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice),
                ),
            ),
        ),
    )
    
    return _pcm_from_response(response)


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
    api_key: str,
    model: str = DEFAULT_TTS_MODEL,
    voice: str = DEFAULT_TTS_VOICE,
) -> Dict[str, Any]:
    """Create a saved Gemini TTS WAV and attach Rhubarb cues when available."""
    clean_question = " ".join(str(question or "").split())
    if not clean_question:
        raise AudioSynthesisError("Question text is required for speech synthesis.")
    
    last_error: Optional[Exception] = None
    for _ in range(2):
        try:
            pcm = _generate_pcm(clean_question, api_key, model, voice)
            if not pcm:
                raise AudioSynthesisError("Gemini TTS returned an empty audio response.")
            break
        except Exception as exc:
            last_error = exc
    else:
        raise AudioSynthesisError("Gemini TTS could not generate question audio.") from last_error
    
    filename = f"interview-question-{uuid.uuid4().hex}.wav"
    audio_path = ensure_generated_audio_directory() / filename
    _write_wav(audio_path, pcm)
    
    try:
        mouth_cues = generate_mouth_cues(audio_path, clean_question)
    except (LipSyncError, subprocess.TimeoutExpired) as exc:
        warnings.warn(f"Rhubarb lip-sync unavailable for {filename}: {exc}", RuntimeWarning)
        mouth_cues = []
    
    return {"filename": filename, "mouth_cues": mouth_cues}
