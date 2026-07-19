"""
Interview analysis routes — matches the contract documented in the
frontend's src/services/interviewApi.js.
"""
import os
import tempfile
from flask import Blueprint, request, jsonify

try:
    from .transcription import transcribe_audio
    from .confidence import analyze_visual_confidence
    from .correctness import grade_answer
except ImportError:  # pragma: no cover - supports direct script execution
    from transcription import transcribe_audio
    from confidence import analyze_visual_confidence
    from correctness import grade_answer

interview_bp = Blueprint("interview", __name__, url_prefix="/api/interview")


def _pace_score(wpm: int) -> int:
    """Scores speaking pace against a healthy interview range (~110-160 WPM)."""
    if 110 <= wpm <= 160:
        return 95
    distance = min(abs(wpm - 110), abs(wpm - 160))
    return max(40, round(95 - distance * 0.8))


@interview_bp.route("/analyze-answer", methods=["POST"])
def analyze_answer():
    question_index = int(request.form.get("questionIndex", 0))
    question = request.form.get("question", "")

    audio_file = request.files.get("audio")
    if audio_file is None:
        return jsonify({"error": "audio file is required"}), 400

    frames = request.form.getlist("frames")  # repeated field, one data URL per frame

    # Whisper needs a real file on disk.
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        transcription = transcribe_audio(tmp_path)
    finally:
        os.remove(tmp_path)

    visual = analyze_visual_confidence(frames)
    pace_score = _pace_score(transcription["words_per_minute"])

    confidence_score = round(
        0.35 * visual["eyeContact"] + 0.35 * visual["steadiness"] + 0.30 * pace_score
    )
    confidence_label = (
        "Strong" if confidence_score >= 75 else "Steady" if confidence_score >= 55 else "Hesitant"
    )

    correctness = grade_answer(question, transcription["transcript"])
    overall_score = round(correctness["score"] * 0.6 + confidence_score * 0.4)

    return jsonify(
        {
            "questionIndex": question_index,
            "question": question,
            "transcript": transcription["transcript"],
            "confidence": {
                "score": confidence_score,
                "label": confidence_label,
                "breakdown": {
                    "eyeContact": visual["eyeContact"],
                    "steadiness": visual["steadiness"],
                    "pace": pace_score,
                },
            },
            "correctness": correctness,
            "overallScore": overall_score,
        }
    )


@interview_bp.route("/complete", methods=["POST"])
def complete_interview():
    body = request.get_json(silent=True) or {}
    answers = body.get("answers", [])

    if not answers:
        return jsonify({"error": "answers array is required"}), 400

    overall_score = round(sum(a["overallScore"] for a in answers) / len(answers))

    # TODO: this is a fixed placeholder — have the LLM look at all
    # transcripts + scores together and generate tailored strengths/
    # improvements instead, the same way grade_answer() does per-answer.
    strengths = [
        "Answers were well-structured, with a clear beginning and resolution.",
        "Maintained steady eye contact through most of the session.",
    ]
    improvements = [
        "Quantify impact where possible — numbers make answers more memorable.",
        "A couple of answers ran long; aim to land the core point within 90 seconds.",
    ]

    return jsonify(
        {"overallScore": overall_score, "strengths": strengths, "improvements": improvements}
    )
