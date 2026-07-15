# Vision Module

Standalone facial-emotion analysis in Python — the server-side/offline
counterpart to the [face-api.js](../../Frontend/interview.html) pipeline
that runs live in the browser during an interview.

## Why two implementations?

`Frontend/interview.html` already does real-time facial expression
detection client-side, using face-api.js — that's the right call for the
live interview experience: zero network round-trip, works the instant a
student opens the page, no server required.

This module exists for everything that *isn't* a live browser tab:

- Batch-analyzing recorded interview footage
- Offline evaluation / regression testing of the scoring logic
- A future `POST /api/analyze-frame` endpoint if session data ever needs
  to be re-scored or audited server-side (see the project roadmap)

Both implementations use the same confidence formula, so a score computed
here and a score computed in the browser mean the same thing:

```
confidence = 0.7 * (avg(happy) + avg(neutral)) + 0.3 * face_presence_rate
```

## Architecture

| Stage | Tool | Notes |
|---|---|---|
| Face detection | OpenCV Haar Cascade | Bundled with `opencv-python`, no download |
| Emotion classification | Quantized TFLite CNN (93 KB) | Trained on FER2013, vendored — see `THIRD_PARTY_NOTICES.md` |
| Scoring | Pure Python (`compute_confidence_score`) | Matches `computeFinalScores()` in `interview.html` |

7 emotion classes: `angry`, `disgust`, `fear`, `happy`, `sad`, `surprise`, `neutral`.

## Setup

```bash
cd Ai_Module/Vision
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
```

## Usage

**As a library:**

```python
from vision_analyzer import VisionAnalyzer
import cv2

analyzer = VisionAnalyzer()

frame = cv2.imread("some_photo.jpg")
result = analyzer.analyze_frame(frame)
print(result.dominant_emotion, result.emotions)

# after feeding it every frame from a question/session:
summary = analyzer.summarize_session()
print(summary.confidence_score, summary.dominant_emotions)
```

**CLI demo:**

```bash
python demo.py --webcam            # live demo, press 'q' to see your summary
python demo.py --image photo.jpg   # single-image analysis
```

## Tests

```bash
pytest test_vision_analyzer.py -v
```

The scoring formula (`compute_confidence_score`) is tested as a pure
function with no camera or model involved, so it always runs fast and
deterministically and needs nothing extra to pass.

The detection/classification tests look for `test_face.jpg` in this
folder and **skip gracefully if it's missing** — it's gitignored on
purpose, since bundling a photo of a real person into a public portfolio
repo isn't great practice. To exercise those tests locally, drop in any
clear face photo (a webcam selfie works fine) as `test_face.jpg`; they
check output invariants (probabilities sum to 1, presence rate is sane)
rather than hardcoding exact model outputs, so any face photo will do.

## Known limitation

`tf.lite.Interpreter` is deprecated as of TensorFlow 2.20 in favor of the
`ai_edge_litert` package — `requirements.txt` pins `tensorflow-cpu<2.20`
for now. Worth migrating before that ceiling becomes a problem.
