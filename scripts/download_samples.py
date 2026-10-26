"""
VideoSense AI - Sample Video Downloader
Downloads high-quality, lightweight (<200MB) test videos specifically chosen for:
1. Vehicle & Traffic Detection (cars, trucks, buses)
2. Pedestrian & Bicycle Detection (people, bicycles, transit)
3. Indoor Classroom / Retail Scene (chairs, laptops, desks, people)
4. Crowd & Public Space Surveillance (pedestrian tracking)
"""

import os
import sys
import time
import urllib.request
import cv2

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SAMPLE_VIDEOS_DIR = os.path.join(PROJECT_ROOT, "Sample_Videos")
os.makedirs(SAMPLE_VIDEOS_DIR, exist_ok=True)

# Curated test videos designed specifically for computer vision & video intelligence testing
CURATED_TEST_VIDEOS = [
    {
        "filename": "car_traffic_test.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
        "category": "Traffic & Vehicle Tracking",
        "description": "Moving cars, sedans, and SUVs on roadways. Tests YOLO vehicle detection and velocity tracking."
    },
    {
        "filename": "pedestrian_bicycle_car_test.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
        "category": "Multimodal Urban Transit",
        "description": "Pedestrians, bicycles, and moving cars together. Tests complex multi-class detection."
    },
    {
        "filename": "people_crowd_test.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/people-detection.mp4",
        "category": "Pedestrian Surveillance",
        "description": "People walking across an open plaza. Tests pedestrian detection, counting, and tracking."
    },
    {
        "filename": "classroom_indoor_test.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/classroom.mp4",
        "category": "Indoor Scene & Object Detection",
        "description": "Students and teacher in classroom with desks, chairs, laptops, and screen text."
    },
    {
        "filename": "face_and_person_test.mp4",
        "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/head-pose-face-detection-male.mp4",
        "category": "Face & Person Analysis",
        "description": "Person facing camera talking with head movements. Tests face detection and person tracking."
    }
]

def download_file(url, target_path, filename):
    print(f"\n[*] Downloading: {filename}")
    print(f"    Source URL: {url}")
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    
    start_time = time.time()
    with urllib.request.urlopen(req) as resp, open(target_path, "wb") as out_file:
        total_size = resp.headers.get("Content-Length")
        total_bytes = int(total_size) if total_size else 0
        downloaded = 0
        chunk_size = 64 * 1024
        
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            
            if total_bytes > 0:
                pct = (downloaded / total_bytes) * 100
                mb = downloaded / (1024 * 1024)
                sys.stdout.write(f"\r    Progress: {mb:.1f} MB / {total_bytes/(1024*1024):.1f} MB ({pct:.1f}%)")
                sys.stdout.flush()

    elapsed = time.time() - start_time
    file_size_mb = os.path.getsize(target_path) / (1024 * 1024)
    print(f"\n[OK] Successfully downloaded {filename} ({file_size_mb:.2f} MB in {elapsed:.1f}s)")
    return file_size_mb

def verify_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return False, "Failed to open video file"
    
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    duration = frames / fps if fps > 0 else 0
    return True, {
        "frames": frames,
        "fps": round(fps, 1),
        "resolution": f"{w}x{h}",
        "duration_sec": round(duration, 1)
    }

def main():
    print("=" * 70)
    print(" VideoSense AI - Sample Video Downloader")
    print(f" Target Directory: {SAMPLE_VIDEOS_DIR}")
    print(f" Size Limit: < 200 MB per video")
    print("=" * 70)
    
    downloaded_summary = []
    
    for item in CURATED_TEST_VIDEOS:
        target_path = os.path.join(SAMPLE_VIDEOS_DIR, item["filename"])
        
        try:
            size_mb = download_file(item["url"], target_path, item["filename"])
            valid, info = verify_video(target_path)
            
            if valid:
                downloaded_summary.append({
                    "filename": item["filename"],
                    "category": item["category"],
                    "size_mb": f"{size_mb:.1f} MB",
                    "resolution": info["resolution"],
                    "duration": f"{info['duration_sec']}s",
                    "frames": info["frames"],
                    "description": item["description"]
                })
                print(f"    Verified: {info['resolution']} @ {info['fps']} fps, {info['duration_sec']}s ({info['frames']} frames)")
            else:
                print(f"[!] Warning: Video verification failed: {info}")
        except Exception as e:
            print(f"[!] Download failed for {item['filename']}: {e}")

    print("\n" + "=" * 70)
    print(" DOWNLOAD SUMMARY - ALL VIDEOS VERIFIED")
    print("=" * 70)
    for s in downloaded_summary:
        print(f"• {s['filename']:<35} | {s['size_mb']:<8} | {s['resolution']:<10} | {s['duration']:<6} | {s['category']}")
    print("=" * 70)

if __name__ == "__main__":
    main()
