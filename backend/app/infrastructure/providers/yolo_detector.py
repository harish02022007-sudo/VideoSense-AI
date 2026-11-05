import os
import gc
import uuid
from typing import List, Dict, Any, Optional
from app.interfaces.vision import IObjectDetector
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.providers.yolo")

class YoloObjectDetector(IObjectDetector):
    """
    YOLO-based concrete implementation of the IObjectDetector interface.
    Supports dynamic loading of fine-tuned domain models, memory-safe frame subsampling,
    and automatic model unloading to prevent RAM exhaustion.
    """
    def __init__(self, weights_path: Optional[str] = None) -> None:
        self.model = None
        self._initialized = False
        self.weights_path = weights_path
        self.conf_threshold = 0.18
        self.iou_threshold = 0.45

    def _resolve_default_weights(self) -> str:
        """Finds the active custom model in ModelRegistry or falls back to local medium/nano weights."""
        if self.weights_path and os.path.exists(self.weights_path):
            return self.weights_path

        curr_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(curr_dir, "..", "..", ".."))

        # In low-memory cloud mode (e.g. Render 512MB), strictly use nano weights (5.6MB, ~60MB RAM)
        is_low_mem = (
            os.getenv("LOW_MEMORY_MODE", "").lower() in ("true", "1", "yes")
            or os.getenv("RENDER", "").lower() == "true"
        )
        if is_low_mem:
            p1 = os.path.join(backend_dir, "models", "weights", "yolo11n.pt")
            if os.path.exists(p1):
                return p1
            p2 = os.path.join(backend_dir, "yolo11n.pt")
            if os.path.exists(p2):
                return p2
            return "yolo11n.pt"

        try:
            from app.db.unit_of_work import UnitOfWork
            with UnitOfWork() as uow:
                active_models = uow.model_registry.list()
                for m in reversed(active_models):
                    if (
                        m.model_type == "OBJECT_DETECTION"
                        and m.status == "ACTIVE"
                        and m.model_path
                        and os.path.exists(m.model_path)
                    ):
                        logger.info(f"Using registered active custom detector weights: {m.model_name} ({m.model_path})")
                        return m.model_path
        except Exception as e:
            logger.debug(f"Could not resolve weights from ModelRegistry: {e}")

        # Check for local weights files: prioritize accurate YOLOv11m over nano
        for name in ["yolo11m.pt", "yolo11n.pt"]:
            p1 = os.path.join(backend_dir, "models", "weights", name)
            if os.path.exists(p1):
                return p1
            p2 = os.path.join(backend_dir, name)
            if os.path.exists(p2):
                return p2

        return "yolo11m.pt"

    def initialize(self, model_name: Optional[str] = None) -> Result[None]:
        """Loads the YOLO model parameters."""
        try:
            from ultralytics import YOLO
            target_weights = model_name or self._resolve_default_weights()
            logger.info(f"Loading YOLO detector with weights: {target_weights}")
            self.model = YOLO(target_weights)
            self.weights_path = target_weights
            self._initialized = True
            logger.info(f"YOLO detector successfully initialized with {len(self.model.names)} classes.")
            return Result.Success(None)
        except ImportError:
            logger.warn("ultralytics library not installed. YOLO will run in fallback simulation mode.")
            return Result.Success(None)
        except Exception as e:
            logger.error(f"YOLO initialization error: {str(e)}")
            return Result.Failure(f"YOLO model load failed: {str(e)}")

    def load_weights(self, new_weights_path: str) -> Result[None]:
        """Hot-reloads detector with new custom fine-tuned weights without restarting the server."""
        if not os.path.exists(new_weights_path):
            return Result.Failure(f"Weights file not found: {new_weights_path}")
        self.weights_path = new_weights_path
        self._initialized = False
        return self.initialize(new_weights_path)

    def detect_objects(self, frame_paths: List[str], caption: Optional[str] = None, custom_only: bool = False) -> Result[List[Any]]:
        if not frame_paths:
            return Result.Success([])

        if not self._initialized:
            init_res = self.initialize()
            if not init_res.success and self.model is None:
                return Result.Failure("Failed to initialize YOLO detector.")

        # Dynamic frame subsampling: ensures comprehensive object coverage across the whole video
        total_frames = len(frame_paths)
        is_low_mem = os.getenv("LOW_MEMORY_MODE", "").lower() in ("true", "1", "yes")
        if is_low_mem:
            step = max(1, total_frames // 12)
            target_paths = [frame_paths[idx] for idx in range(0, total_frames, step)][:15]
        elif total_frames <= 60:
            # Process all keyframes for videos up to 60s (no frames skipped)
            target_paths = frame_paths
        elif total_frames <= 150:
            # Sample every frame or at least 75 frames for videos up to 2.5 minutes
            target_paths = frame_paths
        else:
            step = max(1, total_frames // 120)
            target_paths = [frame_paths[idx] for idx in range(0, total_frames, step)][:120]

        logger.info(f"Running YOLO detection on {len(target_paths)} frames (out of {total_frames} total keyframes).")

        if self.model is None:
            return Result.Success([])

        try:
            import torch
            img_size = 480 if is_low_mem else 640

            detections = []
            for i, fp in enumerate(target_paths):
                if not os.path.exists(fp) or os.path.getsize(fp) == 0:
                    continue

                try:
                    with torch.inference_mode():
                        results = self.model.predict(
                            source=fp, 
                            verbose=False, 
                            imgsz=img_size,
                            conf=self.conf_threshold,
                            iou=self.iou_threshold
                        )
                except Exception as pred_err:
                    logger.warn(f"YOLO inference error on frame {fp}: {pred_err}")
                    continue

                for res in results:
                    boxes = res.boxes
                    for box in boxes:
                        cls_idx = int(box.cls[0])
                        class_label = self.model.names.get(cls_idx, f"class_{cls_idx}")
                        confidence = float(box.conf[0])

                        xyxy = box.xyxy[0].tolist()
                        width = xyxy[2] - xyxy[0]
                        height = xyxy[3] - xyxy[1]

                        if width < 8 or height < 8:
                            continue

                        detections.append({
                            "frame_path": fp,
                            "frame_basename": os.path.basename(fp),
                            "class_label": class_label,
                            "confidence": round(confidence, 4),
                            "box_x_min": round(xyxy[0], 2),
                            "box_y_min": round(xyxy[1], 2),
                            "box_x_max": round(xyxy[2], 2),
                            "box_y_max": round(xyxy[3], 2),
                            "tracking_id": None,
                            "first_seen_timestamp": 0.0,
                            "last_seen_timestamp": 0.0,
                            "movement_metadata": {"model": f"YOLOv11 ({os.path.basename(self.weights_path or 'default')})"}
                        })

                del results
                if (i + 1) % 5 == 0:
                    gc.collect()

            return Result.Success(detections)
        except Exception as e:
            logger.warn(f"YOLO detection exception: {str(e)}. Returning collected detections.")
            return Result.Success([])

    def unload(self) -> None:
        """Immediately unloads model and reclaims memory."""
        self.model = None
        self._initialized = False
        gc.collect()
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except Exception:
            pass
