#!/usr/bin/env python
"""
VideoSense AI - Vision Model Fine-Tuning CLI
--------------------------------------------
Trains / Fine-tunes YOLOv11 on custom datasets (e.g., Indian Traffic, Surveillance, Retail)
using real supervised backpropagation on PyTorch with NVIDIA CUDA GPU acceleration.

Usage:
    python scripts/train_vision_model.py --data datasets/traffic/data.yaml --epochs 30 --batch 8 --device cuda
    python scripts/train_vision_model.py --init-dataset datasets/indian_traffic
"""

import os
import sys
import argparse

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import torch
from app.mlops.dataset_manager import DatasetManager, DEFAULT_TRAFFIC_CLASSES
from app.mlops.train_detector import VisionModelTrainer


def parse_args():
    parser = argparse.ArgumentParser(description="VideoSense AI Vision Model Training Pipeline")
    parser.add_argument("--data", type=str, default="datasets/indian_traffic/data.yaml", help="Path to YOLO data.yaml configuration")
    parser.add_argument("--model-name", type=str, default="yolov11_traffic_detector", help="Name to identify fine-tuned model")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs (default: 30)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution for training (default: 640)")
    parser.add_argument("--lr", type=float, default=0.001, help="Initial learning rate (default: 0.001)")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device (cuda or cpu)")
    parser.add_argument("--init-dataset", type=str, default=None, help="Initialize a template dataset folder and exit")
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 70)
    print(" VideoSense AI - Vision Model Training Pipeline")
    print("=" * 70)
    print(f"PyTorch Version  : {torch.__version__}")
    print(f"CUDA Available   : {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU Device       : {torch.cuda.get_device_name(0)}")
    print(f"Target Device    : {args.device}")
    print("=" * 70)

    # Dataset template initialization
    if args.init_dataset:
        print(f"[*] Initializing dataset structure at: {args.init_dataset}")
        struct = DatasetManager.create_dataset_structure(args.init_dataset, DEFAULT_TRAFFIC_CLASSES)
        print(f"[OK] Created dataset config at: {struct['data_yaml']}")
        print(f"[OK] Standard Classes ({len(DEFAULT_TRAFFIC_CLASSES)}): {', '.join(DEFAULT_TRAFFIC_CLASSES)}")
        print("\nNext steps:")
        print(f"  1. Place training images into: {struct['images_train']}")
        print(f"  2. Place training YOLO annotations (.txt) into: {struct['labels_train']}")
        print(f"  3. Run: python scripts/train_vision_model.py --data {struct['data_yaml']} --epochs 30")
        sys.exit(0)

    # Validate dataset
    data_yaml_path = os.path.abspath(args.data)
    print(f"[*] Validating dataset at: {data_yaml_path}...")
    val_res = DatasetManager.validate_dataset(data_yaml_path)

    if not val_res.get("valid"):
        print(f"\n[!] Dataset Validation Error: {val_res.get('error')}")
        print("\nTo generate a clean dataset template, run:")
        print(f"    python scripts/train_vision_model.py --init-dataset {os.path.dirname(data_yaml_path)}")
        sys.exit(1)

    print(f"[OK] Dataset is valid! Classes: {val_res.get('classes')}")
    print(f"[OK] Train images: {val_res.get('train_images_count')}, Val images: {val_res.get('val_images_count')}")
    print(f"[OK] Total annotated boxes: {val_res.get('total_annotated_boxes')}")

    if val_res.get("train_images_count", 0) == 0:
        print("\n[!] Error: No training images found in images/train!")
        print("Please add annotated training images before starting training.")
        sys.exit(1)

    print("\n[*] Starting supervised fine-tuning...")
    trainer = VisionModelTrainer()
    trainer.device = "0" if args.device.startswith("cuda") else "cpu"

    result = trainer.train(
        data_yaml=data_yaml_path,
        model_name=args.model_name,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch,
        learning_rate=args.lr
    )

    if result.get("success"):
        print("\n" + "=" * 70)
        print(" [OK] Training Completed Successfully!")
        print("=" * 70)
        print(f"Model ID        : {result['model_id']}")
        print(f"Model Name      : {result['model_name']}")
        print(f"Trained Weights : {result['weights_path']}")
        print(f"Training Time   : {result['training_time_seconds']} seconds")
        print("\nEvaluation Metrics:")
        metrics = result.get("metrics", {})
        print(f"  - mAP@50     : {metrics.get('mAP50', 0):.4f}")
        print(f"  - mAP@50:95  : {metrics.get('mAP50_95', 0):.4f}")
        print(f"  - Precision  : {metrics.get('precision', 0):.4f}")
        print(f"  - Recall     : {metrics.get('recall', 0):.4f}")
        print("=" * 70)
        print(f"[OK] Model registered in platform ModelRegistry and ready for video inference!")
    else:
        print(f"\n[!] Training failed: {result.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
