import json
import urllib.request

base = 'http://127.0.0.1:8000'

with urllib.request.urlopen(base + '/api/health') as response:
    print('HEALTH', response.read().decode())

payload = json.dumps({'email': 'davis.gavril@institution.edu', 'password': 'password123', 'role': 'student'}).encode()
req = urllib.request.Request(base + '/api/login', data=payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as response:
    print('LOGIN', response.read().decode())
