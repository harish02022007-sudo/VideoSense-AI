"""
VideoSense AI - Safe GPU Training Script with Active VRAM Watchdog
Monitors GPU VRAM to ensure memory never approaches the 3.8GB limit on 4GB GPUs.
Trains YOLOv11 on Indian street dataset, registers weights, and validates on video frames.
"""

import os
import sys
import shutil
import time
import cv2
import torch

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ultralytics import YOLO
from app.db.unit_of_work import UnitOfWork
from app.models.model_registry import ModelRegistry

DATA_YAML = os.path.join(PROJECT_ROOT, "datasets", "indian_traffic", "data.yaml")
BASE_MODEL = os.path.join(BACKEND_DIR, "yolo11m.pt")
WEIGHTS_DIR = os.path.join(BACKEND_DIR, "models", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

FINAL_WEIGHTS_PATH = os.path.join(WEIGHTS_DIR, "yolov11_traffic_best.pt")

MAX_SAFE_VRAM_GB = 3.6  # Safety threshold strictly below 3.8GB

def check_initial_gpu():
    if not torch.cuda.is_available():
        print("[!] CUDA not available. Running on CPU.")
        return "cpu"
    
    dev_name = torch.cuda.get_device_name(0)
    total_mem = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    curr_alloc = torch.cuda.memory_allocated(0) / (1024 ** 3)
    curr_res = torch.cuda.memory_reserved(0) / (1024 ** 3)
    print("=" * 65)
    print(" GPU HARDWARE STATUS")
    print("=" * 65)
    print(f"Device Name      : {dev_name}")
    print(f"Total VRAM       : {total_mem:.2f} GB")
    print(f"Current Alloc    : {curr_alloc:.2f} GB")
    print(f"Current Reserved : {curr_res:.2f} GB")
    print(f"VRAM Stop Limit  : {MAX_SAFE_VRAM_GB:.2f} GB (User safety mandate: stop if near 3.8GB)")
    print("=" * 65)
    torch.cuda.empty_cache()
    return "0"

def train_with_vram_protection(epochs=20, batch_size=4):
    device = check_initial_gpu()
    print(f"\n[*] Initializing YOLOv11 from: {BASE_MODEL}")
    model = YOLO(BASE_MODEL)

    # Attach VRAM watchdog callback
    def vram_safety_callback(trainer):
        if torch.cuda.is_available():
            reserved_gb = torch.cuda.memory_reserved(0) / (1024 ** 3)
            alloc_gb = torch.cuda.memory_allocated(0) / (1024 ** 3)
            if reserved_gb >= MAX_SAFE_VRAM_GB or alloc_gb >= MAX_SAFE_VRAM_GB:
                print(f"\n[EMERGENCY STOP] VRAM used {reserved_gb:.2f} GB >= {MAX_SAFE_VRAM_GB} GB! Stopping immediately to protect GPU from overheating!")
                trainer.stop = True

    model.add_callback("on_train_batch_end", vram_safety_callback)

    runs_dir = os.path.join(BACKEND_DIR, "runs", "train")
    os.makedirs(runs_dir, exist_ok=True)
    run_name = f"indian_traffic_{int(time.time())}"

    print(f"[*] Starting fine-tuning: epochs={epochs}, batch={batch_size}, imgsz=640, device={device}...")
    start_time = time.time()

    train_res = model.train(
        data=DATA_YAML,
        epochs=epochs,
        batch=batch_size,
        imgsz=640,
        device=device,
        project=runs_dir,
        name=run_name,
        amp=True,       # fp16 mixed precision for minimal VRAM usage (~1.4GB)
        workers=2,
        save=True,
        plots=False,
        verbose=True
    )

    elapsed = int(time.time() - start_time)
    print(f"\n[OK] Training finished in {elapsed} seconds!")

    # Locate best weights
    best_weights = os.path.join(runs_dir, run_name, "weights", "best.pt")
    last_weights = os.path.join(runs_dir, run_name, "weights", "last.pt")
    src_weights = best_weights if os.path.exists(best_weights) else last_weights

    shutil.copy2(src_weights, FINAL_WEIGHTS_PATH)
    print(f"[OK] Saved trained model to permanent location: {FINAL_WEIGHTS_PATH}")

    # Register in ModelRegistry table
    file_size_mb = os.path.getsize(FINAL_WEIGHTS_PATH) / (1024 * 1024)
    model_id = f"yolov11-indian-traffic-{int(time.time())}"
    with UnitOfWork() as uow:
        # Mark other object detection models inactive
        for m in uow.model_registry.list():
            if m.model_type == "OBJECT_DETECTION":
                m.status = "INACTIVE"
        
        model_name = "YOLOv11 Indian Traffic & Street Detector"
        reg_entry = ModelRegistry(
            id=model_id,
            model_name=model_name,
            model_type="OBJECT_DETECTION",
            version="1.0.0",
            provider="ultralytics",
            status="ACTIVE",
            model_path=FINAL_WEIGHTS_PATH,
            model_size=f"{file_size_mb:.1f}MB",
            hardware_requirement="GPU (CUDA)",
            memory_requirement="2GB"
        )
        uow.model_registry.add(reg_entry)
        uow.commit()

    print(f"[OK] Registered '{model_name}' as ACTIVE detector in ModelRegistry (ID: {model_id})")
    return FINAL_WEIGHTS_PATH

def test_trained_model(weights_path):
    print("\n" + "=" * 65)
    print(" VERIFICATION TEST ON TEST VIDEO FRAME")
    print("=" * 65)
    
    test_img_path = os.path.join(PROJECT_ROOT, "datasets", "indian_traffic", "images", "val", "street_frame_00000.jpg")
    if not os.path.exists(test_img_path):
        test_img_path = os.path.join(PROJECT_ROOT, "datasets", "indian_traffic", "images", "train", "street_frame_00050.jpg")

    print(f"Testing weights: {weights_path}")
    print(f"Test image: {test_img_path}")

    model = YOLO(weights_path)
    results = model.predict(test_img_path, conf=0.30, imgsz=640, device="0" if torch.cuda.is_available() else "cpu")

    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, str(cls_id))
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            detections.append({
                "class": cls_name,
                "confidence": round(conf, 3),
                "box": [round(c, 1) for c in xyxy]
            })

    print(f"\n[OK] Detection Results on Street Scene ({len(detections)} objects found):")
    for d in detections:
        print(f"  - Class: {d['class']:<15} Conf: {d['confidence']*100:.1f}%  Box: {d['box']}")

    # Save visual verification image
    out_dir = os.path.join(BACKEND_DIR, "uploads")
    os.makedirs(out_dir, exist_ok=True)
    out_img_path = os.path.join(out_dir, "test_trained_detection.jpg")
    for r in results:
        r.save(filename=out_img_path)
    print(f"\n[OK] Visual verification image saved to: {out_img_path}")
    return detections

if __name__ == "__main__":
    trained_weights = train_with_vram_protection(epochs=20, batch_size=4)
    test_trained_model(trained_weights)
