"""
PlaceAI backend — Flask app entrypoint.

Run with: python app.py   (serves on http://localhost:5000)
Health check: curl http://localhost:5000/health
"""
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.interview import interview_bp


def create_app():
    app = Flask(__name__)

    # Vite's dev server runs on a different origin than Flask, so the
    # browser blocks requests unless we explicitly allow it here.
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS(app, origins=[frontend_origin])

    app.register_blueprint(interview_bp)

    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
