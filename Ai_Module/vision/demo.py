"""
demo.py
--------
Command-line demo for the PlaceAI Vision module.

Usage:
    python demo.py --webcam            # live demo; press 'q' to stop and see the summary
    python demo.py --image path.jpg    # analyze a single saved image
"""

import argparse
import sys

import cv2

from vision_analyzer import VisionAnalyzer, SessionSummary


def run_webcam(analyzer: VisionAnalyzer) -> None:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open a webcam on this machine.")
        sys.exit(1)

    print("Webcam started. Press 'q' in the video window to stop and see your summary.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        result = analyzer.analyze_frame(frame)
        if result.face_found:
            assert result.box is not None and result.dominant_emotion is not None  # guaranteed together by analyze_frame() when face_found=True
            x, y, w, h = result.box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 200, 0), 2)
            top_label = f"{result.dominant_emotion} {result.emotions[result.dominant_emotion] * 100:.0f}%"
            cv2.putText(frame, top_label, (x, max(0, y - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)
        else:
            cv2.putText(frame, "no face detected", (20, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 220), 2)

        cv2.imshow("PlaceAI Vision Demo", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print_summary(analyzer.summarize_session())


def run_image(analyzer: VisionAnalyzer, path: str) -> None:
    frame = cv2.imread(path)
    if frame is None:
        print(f"Could not read image: {path}")
        sys.exit(1)

    result = analyzer.analyze_frame(frame)
    if not result.face_found:
        print("No face detected in that image.")
        return

    print(f"Dominant emotion: {result.dominant_emotion}")
    for label, score in sorted(result.emotions.items(), key=lambda kv: -kv[1]):
        print(f"  {label:10s} {score * 100:5.1f}%")

    print_summary(analyzer.summarize_session())


def print_summary(summary: SessionSummary) -> None:
    print("\n--- Session Summary ---")
    print(f"Frames analyzed:  {summary.frames_analyzed}")
    print(f"Face present:     {summary.presence_rate * 100:.0f}% of frames")
    print(f"Confidence score: {summary.confidence_score}/100")
    if summary.dominant_emotions:
        top = ", ".join(f"{label} {pct}%" for label, pct in summary.dominant_emotions)
        print(f"Top emotions:     {top}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PlaceAI Vision module demo")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--webcam", action="store_true", help="run a live webcam demo")
    group.add_argument("--image", type=str, metavar="PATH", help="analyze a single image file")
    args = parser.parse_args()

    analyzer = VisionAnalyzer()
    if args.webcam:
        run_webcam(analyzer)
    else:
        run_image(analyzer, args.image)
