
import requests

url = "http://127.0.0.1:8000/api/jesters/1"
payload = {"fluxer_avatar_url": "https://example.com/avatar.png"}

print(f"Testing PATCH to {url}")
try:
    response = requests.patch(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
