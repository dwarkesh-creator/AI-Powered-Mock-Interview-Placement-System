#!/usr/bin/env python3
"""Test script to verify Gemini is generating interview questions."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from Backend.main import _generate_questions_llm, _generate_questions_heuristic

print("=" * 60)
print("TESTING GEMINI QUESTION GENERATION")
print("=" * 60)

# Test with Gemini
print("\n🤖 Testing AI-Generated Questions (Gemini):")
print("-" * 60)
try:
    questions = _generate_questions_llm('Software Engineer', 'Python, React, FastAPI, Docker', 3)
    if questions:
        for i, q in enumerate(questions, 1):
            print(f"{i}. {q}")
        
        # Check if questions are from fallback or Gemini
        fallback_questions = _generate_questions_heuristic('Software Engineer', '', 10)
        is_fallback = any(q in fallback_questions for q in questions)
        
        print("\n" + "=" * 60)
        if is_fallback:
            print("❌ RESULT: Using FALLBACK templates (hardcoded)")
            print("   Gemini API call failed or returned no results")
        else:
            print("✅ RESULT: Using GEMINI AI-generated questions!")
            print("   Questions are customized and unique")
        print("=" * 60)
except Exception as e:
    print(f"❌ ERROR: {e}")
    print("\n📝 Fallback Questions (hardcoded):")
    print("-" * 60)
    fallback = _generate_questions_heuristic('Software Engineer', '', 3)
    for i, q in enumerate(fallback, 1):
        print(f"{i}. {q}")
