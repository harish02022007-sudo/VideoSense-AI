import os
import yaml
import glob
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

from app.core.logging import get_logger

logger = get_logger("app.mlops.dataset_manager")

# Standard class definitions for Indian Traffic, Urban & Surveillance environments
DEFAULT_TRAFFIC_CLASSES = [
    "auto_rickshaw",     # 0: Indian 3-wheeler / e-rickshaw / tuk-tuk
    "motorcycle",       # 1: 2-wheeler motorbikes, scooters
    "bicycle",          # 2: Bicycles, cycles
    "person",           # 3: Adult pedestrians / workers
    "child",            # 4: Children / youth
    "cow",              # 5: Cows / bulls / cattle on roads
    "car",              # 6: Cars / sedans / SUVs
    "bus",              # 7: Public / private buses
    "truck",            # 8: Commercial trucks / lorries
    "shop_stall"        # 9: Roadside stalls / kiosks / kiosks
]

class DatasetManager:
    """
    Manages custom training dataset creation, validation, and preparation
    for YOLOv11 and vision model fine-tuning.
    """

    @staticmethod
    def create_dataset_structure(
        base_dir: str,
        classes: Optional[List[str]] = None
    ) -> Dict[str, str]:
        """
        Creates standard YOLOv11 dataset directory structure:
        - base_dir/
            - images/train
            - images/val
            - labels/train
            - labels/val
            - data.yaml
        """
        classes = classes or list(DEFAULT_TRAFFIC_CLASSES)
        abs_base = os.path.abspath(base_dir)

        dirs = {
            "images_train": os.path.join(abs_base, "images", "train"),
            "images_val": os.path.join(abs_base, "images", "val"),
            "labels_train": os.path.join(abs_base, "labels", "train"),
            "labels_val": os.path.join(abs_base, "labels", "val"),
        }

        for path in dirs.values():
            os.makedirs(path, exist_ok=True)

        # Generate data.yaml
        data_yaml_path = os.path.join(abs_base, "data.yaml")
        yaml_content = {
            "path": abs_base.replace("\\", "/"),
            "train": "images/train",
            "val": "images/val",
            "names": {i: name for i, name in enumerate(classes)},
            "nc": len(classes)
        }

        with open(data_yaml_path, "w") as f:
            yaml.dump(yaml_content, f, default_flow_style=False, sort_keys=False)

        dirs["data_yaml"] = data_yaml_path
        dirs["classes"] = classes
        logger.info(f"YOLO dataset structure initialized at {abs_base} with {len(classes)} classes.")
        return dirs

    @staticmethod
    def validate_dataset(data_yaml_path: str) -> Dict[str, Any]:
        """
        Validates YOLO dataset integrity, annotations format, and image counts.
        """
        abs_yaml = os.path.abspath(data_yaml_path)
        if not os.path.exists(abs_yaml):
            # Check relative to project root if executed from backend/
            alt_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", data_yaml_path))
            if os.path.exists(alt_path):
                abs_yaml = alt_path
            else:
                return {"valid": False, "error": f"data.yaml not found at {abs_yaml} or {alt_path}"}

        try:
            with open(abs_yaml, "r") as f:
                cfg = yaml.safe_load(f)

            base_dir = cfg.get("path", os.path.dirname(abs_yaml))
            train_rel = cfg.get("train", "images/train")
            val_rel = cfg.get("val", "images/val")
            names = cfg.get("names", {})

            if isinstance(names, list):
                class_names = names
            elif isinstance(names, dict):
                class_names = [names[k] for k in sorted(names.keys())]
            else:
                return {"valid": False, "error": "Invalid 'names' configuration in data.yaml"}

            train_img_dir = os.path.join(base_dir, train_rel)
            val_img_dir = os.path.join(base_dir, val_rel)

            train_imgs = glob.glob(os.path.join(train_img_dir, "*.*"))
            val_imgs = glob.glob(os.path.join(val_img_dir, "*.*"))

            valid_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
            train_imgs = [f for f in train_imgs if os.path.splitext(f)[1].lower() in valid_extensions]
            val_imgs = [f for f in val_imgs if os.path.splitext(f)[1].lower() in valid_extensions]

            # Check label files
            train_labels_dir = os.path.join(base_dir, "labels", "train")
            val_labels_dir = os.path.join(base_dir, "labels", "val")

            train_labels = glob.glob(os.path.join(train_labels_dir, "*.txt"))
            val_labels = glob.glob(os.path.join(val_labels_dir, "*.txt"))

            # Check label format validity
            invalid_lines = 0
            total_boxes = 0
            class_counts = {name: 0 for name in class_names}

            for lf in train_labels + val_labels:
                with open(lf, "r") as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) == 5:
                            try:
                                cls_id = int(parts[0])
                                cx, cy, w, h = map(float, parts[1:])
                                if 0 <= cls_id < len(class_names) and 0 <= cx <= 1 and 0 <= cy <= 1 and 0 <= w <= 1 and 0 <= h <= 1:
                                    class_counts[class_names[cls_id]] += 1
                                    total_boxes += 1
                                else:
                                    invalid_lines += 1
                            except ValueError:
                                invalid_lines += 1
                        else:
                            invalid_lines += 1

            return {
                "valid": True,
                "data_yaml": abs_yaml,
                "classes": class_names,
                "num_classes": len(class_names),
                "train_images_count": len(train_imgs),
                "val_images_count": len(val_imgs),
                "total_annotated_boxes": total_boxes,
                "invalid_annotations": invalid_lines,
                "class_distribution": class_counts
            }
        except Exception as e:
            return {"valid": False, "error": f"Failed to validate dataset: {str(e)}"}

    @staticmethod
    def create_starter_traffic_dataset(target_dir: str) -> Dict[str, Any]:
        """
        Creates a starter dataset template initialized with Indian street & traffic classes.
        """
        struct = DatasetManager.create_dataset_structure(target_dir, DEFAULT_TRAFFIC_CLASSES)
        return {
            "status": "ready",
            "base_dir": target_dir,
            "data_yaml": struct["data_yaml"],
            "classes": DEFAULT_TRAFFIC_CLASSES,
            "instruction": "Place training images in images/train and YOLO annotation .txt files in labels/train."
        }
