import os
import shutil
import time
import uuid
from typing import Dict, Any, Optional, List
import torch

from app.core.logging import get_logger
from app.db.unit_of_work import UnitOfWork
from app.models.model_registry import ModelRegistry
from app.mlops.dataset_manager import DatasetManager

logger = get_logger("app.mlops.train_detector")

class VisionModelTrainer:
    """
    MLOps Training & Fine-Tuning Pipeline for YOLOv11 and custom vision models.
    Supports PyTorch CUDA GPU training, metrics logging, artifact persistence,
    and automatic database model registration.
    """

    def __init__(self, base_model_path: Optional[str] = None):
        if base_model_path and os.path.exists(base_model_path):
            self.base_model = base_model_path
        else:
            # Default to bundled yolo11m.pt in backend or project root
            curr_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.abspath(os.path.join(curr_dir, "..", ".."))
            local_yolo = os.path.join(backend_dir, "yolo11m.pt")
            self.base_model = local_yolo if os.path.exists(local_yolo) else "yolo11m.pt"

        self.device = "0" if torch.cuda.is_available() else "cpu"
        logger.info(f"VisionModelTrainer initialized with base model: {self.base_model} (Device: {self.device})")

    def train(
        self,
        data_yaml: str,
        model_name: str = "yolo11_traffic_custom",
        epochs: int = 30,
        imgsz: int = 640,
        batch_size: int = 8,
        learning_rate: float = 0.001,
        patience: int = 15,
        project_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes fine-tuning of YOLOv11 on the specified dataset.
        Saves best checkpoint, calculates evaluation metrics, and registers into database.
        """
        from ultralytics import YOLO

        start_time = time.time()
        abs_data_yaml = os.path.abspath(data_yaml)

        # Validate dataset before starting
        val_res = DatasetManager.validate_dataset(abs_data_yaml)
        if not val_res.get("valid"):
            logger.error(f"Cannot start training: Dataset invalid. {val_res.get('error')}")
            return {
                "success": False,
                "error": f"Dataset validation failed: {val_res.get('error')}"
            }

        curr_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(curr_dir, "..", ".."))
        weights_dir = os.path.join(backend_dir, "models", "weights")
        os.makedirs(weights_dir, exist_ok=True)

        if not project_dir:
            project_dir = os.path.join(backend_dir, "runs", "train")
        os.makedirs(project_dir, exist_ok=True)

        run_id = f"{model_name}_{int(time.time())}"

        logger.info(
            f"Starting YOLO fine-tuning: run_id={run_id}, epochs={epochs}, "
            f"batch={batch_size}, imgsz={imgsz}, device={self.device}, data={abs_data_yaml}"
        )

        try:
            model = YOLO(self.base_model)

            train_results = model.train(
                data=abs_data_yaml,
                epochs=epochs,
                imgsz=imgsz,
                batch=batch_size,
                lr0=learning_rate,
                patience=patience,
                device=self.device,
                project=project_dir,
                name=run_id,
                save=True,
                plots=True,
                verbose=True
            )

            # Locate trained best weights
            run_output_dir = os.path.join(project_dir, run_id)
            best_pt = os.path.join(run_output_dir, "weights", "best.pt")
            last_pt = os.path.join(run_output_dir, "weights", "last.pt")

            chosen_pt = best_pt if os.path.exists(best_pt) else last_pt
            if not os.path.exists(chosen_pt):
                raise RuntimeError(f"Training completed but weights file not found in {run_output_dir}/weights/")

            # Copy to permanent models/weights directory
            permanent_weights_path = os.path.join(weights_dir, f"{run_id}.pt")
            shutil.copy2(chosen_pt, permanent_weights_path)
            file_size_mb = os.path.getsize(permanent_weights_path) / (1024 * 1024)

            # Evaluate final metrics
            val_metrics = model.val(data=abs_data_yaml, device=self.device)
            mAP50 = round(float(getattr(val_metrics.box, "map50", 0.0)), 4)
            mAP50_95 = round(float(getattr(val_metrics.box, "map", 0.0)), 4)
            precision = round(float(getattr(val_metrics.box, "mp", 0.0)), 4)
            recall = round(float(getattr(val_metrics.box, "mr", 0.0)), 4)

            elapsed_secs = int(time.time() - start_time)

            # Register in ModelRegistry table
            model_db_id = str(uuid.uuid4())
            registered_name = f"YOLOv11 - {model_name}"
            with UnitOfWork() as uow:
                # Mark previous models of same name as INACTIVE if needed
                reg_entry = ModelRegistry(
                    id=model_db_id,
                    model_name=registered_name,
                    model_type="OBJECT_DETECTION",
                    version=f"custom-v{int(time.time())}",
                    provider="ultralytics",
                    status="ACTIVE",
                    model_path=permanent_weights_path,
                    model_size=f"{file_size_mb:.1f}MB",
                    hardware_requirement="GPU (CUDA)" if torch.cuda.is_available() else "CPU",
                    memory_requirement="2GB"
                )
                uow.model_registry.add(reg_entry)
                uow.commit()

            logger.info(
                f"YOLO fine-tuning successful! Registered model '{registered_name}' "
                f"(ID: {model_db_id}) with mAP50={mAP50}, mAP50-95={mAP50_95} in {elapsed_secs}s."
            )

            return {
                "success": True,
                "model_id": model_db_id,
                "model_name": registered_name,
                "weights_path": permanent_weights_path,
                "epochs_completed": epochs,
                "training_time_seconds": elapsed_secs,
                "metrics": {
                    "mAP50": mAP50,
                    "mAP50_95": mAP50_95,
                    "precision": precision,
                    "recall": recall
                },
                "classes": val_res.get("classes", [])
            }

        except Exception as e:
            logger.error(f"Fine-tuning failed with exception: {e}")
            return {
                "success": False,
                "error": str(e),
                "training_time_seconds": int(time.time() - start_time)
            }
