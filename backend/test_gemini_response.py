from ai.gemini_client import gemini

# Test a simple JSON-returning prompt
test_prompt = '''
Respond ONLY with valid JSON (no markdown, no text outside JSON).
Return a test response with fields: "status", "message", "timestamp".
Example: {"status": "ok", "message": "test successful", "timestamp": "2026-05-30"}
'''

print("Testing Gemini call_json()...")
result = gemini.call_json(test_prompt)
print("Result:", result)
print("Type:", type(result))
if result.get("_fallback"):
    print("ERROR: Fallback triggered. Reason:", result.get("_reason"))
else:
    print("SUCCESS: Gemini responded with valid JSON")
