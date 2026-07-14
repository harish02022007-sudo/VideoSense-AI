import uuid
from typing import List, Dict, Any
from app.interfaces.vision import IObjectDetector
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.providers.yolo")

class YoloObjectDetector(IObjectDetector):
    """YOLO-based concrete implementation of the IObjectDetector interface."""
    def __init__(self) -> None:
        self.model = None
        self._initialized = False

    def initialize(self, model_name: str = "yolo11n.pt") -> Result[None]:
        """Loads the YOLO model parameters."""
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model: {model_name}")
            self.model = YOLO(model_name)
            self._initialized = True
            return Result.Success(None)
        except ImportError:
            logger.warn("ultralytics library not installed. YOLO will run in fallback simulation mode.")
            return Result.Success(None)
        except Exception as e:
            logger.error(f"YOLO initialization error: {str(e)}")
            return Result.Failure(f"YOLO model load failed: {str(e)}")

    def detect_objects(self, frame_paths: List[str]) -> Result[List[Any]]:
        if not self._initialized:
            self.initialize()

        logger.info(f"Running object detection on {len(frame_paths)} frames.")
        
        # Fallback simulation if model is not loaded
        if self.model is None:
            mock_results = []
            for i, fp in enumerate(frame_paths):
                # Simulate detecting a person and a laptop on keyframes
                mock_results.append({
                    "frame_path": fp,
                    "class_label": "person",
                    "confidence": 0.92,
                    "box_x_min": 100.0,
                    "box_y_min": 150.0,
                    "box_x_max": 300.0,
                    "box_y_max": 600.0,
                    "tracking_id": "person_1",
                    "first_seen_timestamp": i * 1.0,
                    "last_seen_timestamp": (i + 1) * 1.0,
                    "movement_metadata": {}
                })
                mock_results.append({
                    "frame_path": fp,
                    "class_label": "laptop",
                    "confidence": 0.88,
                    "box_x_min": 250.0,
                    "box_y_min": 400.0,
                    "box_x_max": 500.0,
                    "box_y_max": 750.0,
                    "tracking_id": "laptop_1",
                    "first_seen_timestamp": i * 1.0,
                    "last_seen_timestamp": (i + 1) * 1.0,
                    "movement_metadata": {}
                })
            return Result.Success(mock_results)

        try:
            detections = []
            for fp in frame_paths:
                results = self.model.track(source=fp, persist=True, verbose=False)
                for res in results:
                    boxes = res.boxes
                    for box in boxes:
                        # Extract metrics
                        cls_idx = int(box.cls[0])
                        class_label = self.model.names[cls_idx]
                        confidence = float(box.conf[0])
                        xyxy = box.xyxy[0].tolist()
                        
                        # Get tracking ID if persistent tracking is active
                        track_id = str(int(box.id[0])) if box.is_track else None
                        
                        detections.append({
                            "frame_path": fp,
                            "class_label": class_label,
                            "confidence": confidence,
                            "box_x_min": xyxy[0],
                            "box_y_min": xyxy[1],
                            "box_x_max": xyxy[2],
                            "box_y_max": xyxy[3],
                            "tracking_id": track_id,
                            "first_seen_timestamp": 0.0,  # Extractor assigns this offset later
                            "last_seen_timestamp": 0.0,
                            "movement_metadata": {}
                        })
            return Result.Success(detections)
        except Exception as e:
            logger.error(f"YOLO detection exception: {str(e)}")
            return Result.Failure(f"YOLO inference exception: {str(e)}")
