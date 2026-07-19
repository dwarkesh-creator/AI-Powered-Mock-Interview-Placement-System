from dotenv import load_dotenv; load_dotenv(".env")
import os
key = os.environ.get("GEMINI_API_KEY", "").strip()

from google import genai
from google.genai import types
client = genai.Client(api_key=key)

# Try specific versioned models
models = ["gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-1.5-flash-001", "gemini-1.5-flash-002"]
for model in models:
    try:
        r = client.models.generate_content(model=model, contents="Hi", config=types.GenerateContentConfig(max_output_tokens=5))
        print(f"{model}: SUCCESS -> {r.text.strip()}")
    except Exception as e:
        msg = str(e).split("'message':")[1].split(",")[0] if "'message':" in str(e) else str(e)[:80]
        print(f"{model}: FAILED -> {msg.strip()}")
