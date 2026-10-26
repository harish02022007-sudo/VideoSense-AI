import requests
import time
import os
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"
VIDEO_PATH = "../Sample_Videos/WhatsApp Video 2026-07-20 at 5.07.11 AM.mp4"

def run_test():
    if not os.path.exists(VIDEO_PATH):
        print(f"Error: Sample video not found at {os.path.abspath(VIDEO_PATH)}")
        sys.exit(1)
        
    print(f"--- 1. UPLOADING SAMPLE VIDEO: {VIDEO_PATH} ---")
    files = {"file": (os.path.basename(VIDEO_PATH), open(VIDEO_PATH, "rb"), "video/mp4")}
    data = {"title": "Real Life Test Video"}
    
    try:
        response = requests.post(f"{BASE_URL}/videos/upload", files=files, data=data)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to connect to backend server. Make sure uvicorn is running on http://127.0.0.1:8000. Error: {e}")
        sys.exit(1)
        
    res_data = response.json()
    assert res_data["success"] is True, "Upload failed"
    
    video_id = res_data["data"]["video_id"]
    job_id = res_data["data"]["job_id"]
    print(f"Successfully uploaded! Video ID: {video_id} | Job ID: {job_id}")
    
    print("\n--- 2. POLLING PIPELINE STAGE PROCESSING STATUS ---")
    completed = False
    attempts = 0
    max_attempts = 200 # 1000 seconds timeout for large videos on CPU
    
    while not completed and attempts < max_attempts:
        time.sleep(5)
        attempts += 1
        
        status_res = requests.get(f"{BASE_URL}/videos/{video_id}/processing")
        status_res.raise_for_status()
        status_data = status_res.json()["data"]
        
        status = status_data["status"]
        current_stage = status_data["current_stage"]
        progress = status_data["progress"]
        
        print(f"[Attempt {attempts}] Status: {status} | Stage: {current_stage} | Progress: {progress}%")
        
        if status == "completed":
            completed = True
            print("\nPipeline execution COMPLETED successfully!")
            break
        elif status == "failed":
            print(f"\nPipeline FAILED. Error: {status_data.get('error_message')}")
            sys.exit(1)
            
    if not completed:
        print("\nTimeout waiting for video processing pipeline completion.")
        sys.exit(1)
        
    print("\n--- 3. EXECUTING SEMANTIC SEARCH QUERIES ---")
    
    # Query 1: Visual frame search (defaults to FRAME modality)
    print("\n[Query 1] Visual Search: 'people walking'")
    q1_payload = {
        "query": "people walking",
        "video_id": video_id,
        "top_k": 3
    }
    q1_res = requests.post(f"{BASE_URL}/search", json=q1_payload)
    q1_res.raise_for_status()
    print("Results:", q1_res.json()["data"])
    
    # Query 2: Speech dialog search (modality AUDIO)
    print("\n[Query 2] Audio Dialogue Search: 'hello'")
    q2_payload = {
        "query": "hello",
        "video_id": video_id,
        "modality": "AUDIO",
        "top_k": 3
    }
    q2_res = requests.post(f"{BASE_URL}/search", json=q2_payload)
    q2_res.raise_for_status()
    print("Results:", q2_res.json()["data"])

    # Query 3: On-screen OCR search (modality TEXT)
    print("\n[Query 3] OCR Text Search: 'text'")
    q3_payload = {
        "query": "text",
        "video_id": video_id,
        "modality": "TEXT",
        "top_k": 3
    }
    q3_res = requests.post(f"{BASE_URL}/search", json=q3_payload)
    q3_res.raise_for_status()
    print("Results:", q3_res.json()["data"])

    print("\nE2E Scenario Ingestion and Retrieval tests ran successfully!")

if __name__ == "__main__":
    run_test()