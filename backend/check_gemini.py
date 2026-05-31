from ai.gemini_client import gemini
print('available=', gemini.available)
print('api_key_present=', bool(gemini.api_key))
print('api_key_len=', len(gemini.api_key) if gemini.api_key else 0)
