"""
Test Gemini API Keys
Quick script to verify if your Gemini API keys are working.
"""

import sys

def test_gemini_key(api_key: str, key_name: str = "API Key") -> bool:
    """Test a single Gemini API key."""
    try:
        import google.genai as genai
        from google.genai import types
    except ImportError:
        print("❌ Error: google-genai package not installed!")
        print("   Run: pip install google-genai")
        return False
    
    if not api_key or api_key.strip() == "":
        print(f"❌ {key_name}: Empty or invalid")
        return False
    
    print(f"\n{'='*60}")
    print(f"Testing: {key_name}")
    print(f"Key: {api_key[:20]}...{api_key[-4:]}")
    print(f"{'='*60}")
    
    try:
        # Initialize client
        client = genai.Client(api_key=api_key.strip())
        
        # Make a simple test request
        config_args = {
            "temperature": 0.7,
            "max_output_tokens": 50,
        }
        if hasattr(types, "ThinkingConfig"):
            config_args["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
        
        print("⏳ Sending test request to Gemini...")
        
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents="Say 'Hello' in one word.",
            config=types.GenerateContentConfig(**config_args),
        )
        
        result = str(getattr(response, "text", "") or "").strip()
        
        if result:
            print(f"✅ SUCCESS! Key is working!")
            print(f"   Response: {result}")
            return True
        else:
            print(f"❌ FAILED: No response from Gemini")
            return False
            
    except Exception as exc:
        error_str = str(exc).lower()
        
        # Check for specific error types
        if "401" in error_str or "unauthorized" in error_str or "invalid" in error_str:
            print(f"❌ FAILED: Invalid API Key")
            print(f"   Error: API key is not valid or expired")
        elif "403" in error_str or "forbidden" in error_str:
            print(f"❌ FAILED: Permission Denied")
            print(f"   Error: API key doesn't have permission")
        elif "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
            print(f"⚠️  WARNING: Rate Limit Hit")
            print(f"   Error: Key is valid but hit 15 RPM limit")
            print(f"   Try again in 1 minute")
            return True  # Key is valid, just rate limited
        else:
            print(f"❌ FAILED: Unknown Error")
            print(f"   Error: {exc}")
        
        return False


def main():
    """Test API keys from command line or interactive input."""
    print("\n" + "="*60)
    print("🔑 Gemini API Key Tester")
    print("="*60)
    
    # Check if keys provided as arguments
    if len(sys.argv) > 1:
        keys = sys.argv[1:]
        print(f"\n📋 Testing {len(keys)} key(s) from command line...")
    else:
        # Interactive mode
        print("\n📝 Enter your API keys (one per line)")
        print("   Press Enter on empty line to start testing")
        print("   Example: AIzaSyC1aBcDeFgHi...")
        print()
        
        keys = []
        while True:
            key = input(f"Key {len(keys) + 1}: ").strip()
            if not key:
                break
            keys.append(key)
        
        if not keys:
            print("\n❌ No keys provided!")
            return
    
    # Test each key
    results = []
    for i, key in enumerate(keys, 1):
        is_valid = test_gemini_key(key, f"Key #{i}")
        results.append((i, is_valid))
    
    # Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    valid_count = sum(1 for _, valid in results if valid)
    total_count = len(results)
    
    for i, valid in results:
        status = "✅ Working" if valid else "❌ Failed"
        print(f"Key #{i}: {status}")
    
    print(f"\n🎯 Total: {valid_count}/{total_count} keys working")
    
    if valid_count > 0:
        rpm_total = valid_count * 15
        print(f"💪 Rate Limit: {rpm_total} RPM ({valid_count} keys × 15 RPM)")
        print(f"👥 Concurrent Users: ~{valid_count * 5} users")
    
    print("\n" + "="*60)
    
    if valid_count == 0:
        print("\n⚠️  No working keys found!")
        print("   Solutions:")
        print("   1. Check if keys are copied correctly (no extra spaces)")
        print("   2. Verify billing is enabled on Google Cloud")
        print("   3. Create new API keys at: https://aistudio.google.com/apikey")
    elif valid_count < total_count:
        print(f"\n⚠️  {total_count - valid_count} key(s) failed")
        print("   Remove failed keys and use only working ones")
    else:
        print("\n🎉 All keys working! Ready to add to Render!")


if __name__ == "__main__":
    main()
