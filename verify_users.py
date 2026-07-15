import json
import urllib.request

req = urllib.request.Request('http://127.0.0.1:8000/api/users')
with urllib.request.urlopen(req) as response:
    users = json.load(response)
    print('users', len(users))
    for user in users:
        print(user['email'], user['name'], user['role'], user['dept'], user['reg_id'])
