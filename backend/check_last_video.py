import requests
import json

res = requests.get('http://localhost:8000/api/v1/videos')
vids = res.json().get('data', [])
vids_sorted = sorted(vids, key=lambda x: x.get('uploaded_at') or '', reverse=True)

print(f"Total videos: {len(vids_sorted)}")
for i, v in enumerate(vids_sorted[:8]):
    safe_name = v.get('filename', '').encode('ascii', errors='replace').decode('ascii')
    print(f"[{i}] ID: {v.get('id')}")
    print(f"    Name: {safe_name}")
    print(f"    Status: {v.get('status')}")
    print(f"    Uploaded: {v.get('uploaded_at')}")
    print(f"    Duration: {v.get('duration')}s")
