import os
import uuid
from typing import List, Dict, Any, Optional
from app.interfaces.vision import IObjectDetector
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.providers.yolo")

class YoloObjectDetector(IObjectDetector):
    """
    YOLO-based concrete implementation of the IObjectDetector interface.
    Supports dynamic loading of fine-tuned domain models (e.g. Indian Traffic / Custom Weights)
    and seamless weight updates from the MLOps Model Registry.
    """
    def __init__(self, weights_path: Optional[str] = None) -> None:
        self.model = None
        self._initialized = False
        self.weights_path = weights_path
        self.conf_threshold = 0.25
        self.iou_threshold = 0.45

    def _resolve_default_weights(self) -> str:
        """Finds the active custom model in ModelRegistry or falls back to default yolo11m.pt."""
        if self.weights_path and os.path.exists(self.weights_path):
            return self.weights_path

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

        curr_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(curr_dir, "..", "..", ".."))
        weights_dir_yolo = os.path.join(backend_dir, "models", "weights", "yolo11m.pt")
        if os.path.exists(weights_dir_yolo):
            return weights_dir_yolo
        local_yolo = os.path.join(backend_dir, "yolo11m.pt")
        if os.path.exists(local_yolo):
            return local_yolo

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
            logger.info(f"YOLO detector successfully initialized with {len(self.model.names)} classes: {list(self.model.names.values())[:10]}...")
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
        if not self._initialized:
            init_res = self.initialize()
            if not init_res.success and self.model is None:
                return Result.Failure("Failed to initialize YOLO detector.")

        logger.info(f"Running YOLO detection on {len(frame_paths)} frames (weights={self.weights_path}, conf={self.conf_threshold}).")

        if self.model is None:
            return Result.Failure("YOLO model instance is unavailable.")

        try:
            detections = []
            total_frames = len(frame_paths)
            for i, fp in enumerate(frame_paths):
                if not os.path.exists(fp) or os.path.getsize(fp) == 0:
                    continue

                results = self.model.predict(
                    source=fp, 
                    verbose=False, 
                    imgsz=640,
                    conf=self.conf_threshold,
                    iou=self.iou_threshold
                )
                if (i + 1) % 20 == 0 or (i + 1) == total_frames:
                    logger.info(f"YOLO detection progress: {i + 1}/{total_frames} frames processed ({(i + 1) / total_frames * 100:.1f}%)")

                for res in results:
                    boxes = res.boxes
                    for box in boxes:
                        cls_idx = int(box.cls[0])
                        class_label = self.model.names.get(cls_idx, f"class_{cls_idx}")
                        confidence = float(box.conf[0])

                        xyxy = box.xyxy[0].tolist()
                        width = xyxy[2] - xyxy[0]
                        height = xyxy[3] - xyxy[1]

                        if width < 15 or height < 15:
                            continue

                        detections.append({
                            "frame_path": fp,
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
            return Result.Success(detections)
        except Exception as e:
            logger.error(f"YOLO detection exception: {str(e)}")
            return Result.Failure(f"YOLO inference exception: {str(e)}")
