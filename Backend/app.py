"""
PlaceAI backend — Flask app entrypoint.

Run with: python app.py   (serves on http://localhost:5000)
Health check: curl http://localhost:5000/health
"""
import os
import sys
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from interview import interview_bp


def create_app():
    app = Flask(__name__)

    # Vite's dev server runs on a different origin than Flask, so the
    # browser blocks requests unless we explicitly allow it here.
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS(app, origins=[frontend_origin])

    app.register_blueprint(interview_bp)

    @app.route('/api/interview/analyze-answer', methods=['POST'])
    def analyze_answer_route():
        try:
            from interview import analyze_answer as interview_analyze_answer
        except ImportError:
            return {"error": "interview analysis handler unavailable"}, 500

        return interview_analyze_answer()

    @app.route('/api/interview/complete', methods=['POST'])
    def complete_interview_route():
        try:
            from interview import complete_interview as interview_complete_interview
        except ImportError:
            return {"error": "interview completion handler unavailable"}, 500

        return interview_complete_interview()

    @app.route('/api/grade-answer', methods=['POST'])
    def grade_answer_route():
        """Grade a single answer — used by the AnswerRecorder component."""
        try:
            from answer_grader import grade_answer as do_grade
        except ImportError:
            return {"error": "grading module unavailable"}, 503

        body = request.get_json(silent=True) or {}
        question = body.get("question", "")
        answer = body.get("answer", "")
        if not answer:
            return {"error": "answer field is required"}, 400

        result = do_grade(question, answer)
        return jsonify(result)

    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
