"""
Speech-to-text service.

Uses faster-whisper (CTranslate2-based Whisper) — runs well on CPU, no
torch dependency, good speed/accuracy trade-off for short interview-
answer clips. Requires ffmpeg to be installed on the system (not just
pip-installable) for audio decoding.

Model loads once at import time and is reused across requests.
"""
try:
    from faster_whisper import WhisperModel
except ImportError:  # pragma: no cover - optional dependency
    WhisperModel = None

# "small" is a good default: fast enough on CPU, meaningfully more
# accurate than "base" for technical vocabulary. Bump to "medium"
# (or "large-v3") if you have a GPU and want better accuracy.
_MODEL_SIZE = "small"
_model = WhisperModel(_MODEL_SIZE, device="cpu", compute_type="int8") if WhisperModel else None


def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribes an audio file on disk.

    Returns the transcript plus a rough words-per-minute estimate,
    which the interview route uses as a speaking-pace signal for the
    confidence score.
    """
    if _model is None:
        return {"transcript": "", "words_per_minute": 0}

    segments, info = _model.transcribe(audio_path, beam_size=5)
    segments = list(segments)
    text = " ".join(segment.text.strip() for segment in segments).strip()

    duration_minutes = max(info.duration / 60, 1 / 60)  # avoid div-by-zero on very short clips
    word_count = len(text.split())
    words_per_minute = round(word_count / duration_minutes)

    return {"transcript": text, "words_per_minute": words_per_minute}
