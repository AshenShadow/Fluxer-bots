
import urllib.request
import json

url = "http://127.0.0.1:8000/api/jesters/1471566346806080119"
try:
    with urllib.request.urlopen(url) as response:
        data = response.read()
        print(data.decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
