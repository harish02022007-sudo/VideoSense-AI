import os
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks

from app.db.unit_of_work import UnitOfWork
from app.models.model_registry import ModelRegistry
from app.mlops.train_detector import VisionModelTrainer
from app.mlops.dataset_manager import DatasetManager, DEFAULT_TRAFFIC_CLASSES
from app.schemas.common import ResponseEnvelope
from app.core.container import Container
from app.core.logging import get_logger

logger = get_logger("app.api.v1.mlops")

router = APIRouter()

# In-memory training task tracking
TRAINING_TASKS: Dict[str, Dict[str, Any]] = {}

class TrainModelRequest(BaseModel):
    data_yaml: str = Field(..., description="Absolute or relative path to YOLO data.yaml configuration file")
    model_name: str = Field("yolov11_traffic_detector", description="Identifier name for the fine-tuned model")
    epochs: int = Field(30, ge=1, le=300, description="Number of training epochs")
    batch_size: int = Field(8, ge=1, le=64, description="Batch size for training")
    imgsz: int = Field(640, ge=320, le=1280, description="Image resolution for training")
    learning_rate: float = Field(0.001, gt=0.0, description="Initial learning rate")
    patience: int = Field(15, ge=1, description="Early stopping patience")


class InitDatasetRequest(BaseModel):
    target_dir: Optional[str] = Field("datasets/indian_traffic", description="Directory to create dataset structure")
    classes: Optional[List[str]] = Field(None, description="Custom classes list (defaults to Indian traffic classes)")


@router.get("/models", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def list_registered_models(request: Request):
    """Lists all AI models registered in the system along with active status and weights."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        models = uow.model_registry.list()
        res = [
            {
                "id": m.id,
                "model_name": m.model_name,
                "model_type": m.model_type,
                "version": m.version,
                "provider": m.provider,
                "status": m.status,
                "model_path": m.model_path,
                "model_size": m.model_size,
                "hardware_requirement": m.hardware_requirement,
                "memory_requirement": m.memory_requirement,
                "loaded_at": m.loaded_at.isoformat() if m.loaded_at else None,
                "last_used_at": m.last_used_at.isoformat() if m.last_used_at else None
            }
            for m in models
        ]

    return ResponseEnvelope(
        success=True,
        message=f"Retrieved {len(res)} registered models.",
        data=res,
        request_id=request_id
    )


@router.post("/dataset/init", response_model=ResponseEnvelope[Dict[str, Any]])
def initialize_dataset(payload: InitDatasetRequest, request: Request):
    """
    Initializes a standard YOLOv11 dataset directory structure with data.yaml,
    images/train, images/val, labels/train, labels/val, configured for Indian Traffic & Surveillance classes.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    base_dir = os.path.abspath(payload.target_dir or "datasets/indian_traffic")
    classes = payload.classes or DEFAULT_TRAFFIC_CLASSES

    struct = DatasetManager.create_dataset_structure(base_dir, classes)
    return ResponseEnvelope(
        success=True,
        message="Dataset directory structure initialized successfully.",
        data={
            "base_dir": base_dir,
            "data_yaml": struct["data_yaml"],
            "classes": classes,
            "subdirectories": [
                struct["images_train"],
                struct["images_val"],
                struct["labels_train"],
                struct["labels_val"]
            ]
        },
        request_id=request_id
    )


class ValidateDatasetRequest(BaseModel):
    data_yaml: str = Field(..., description="Path to data.yaml")


@router.post("/dataset/validate", response_model=ResponseEnvelope[Dict[str, Any]])
def validate_dataset_endpoint(payload: ValidateDatasetRequest, request: Request):
    """Validates an existing YOLO dataset for training readiness."""
    request_id = getattr(request.state, "request_id", "N/A")
    res = DatasetManager.validate_dataset(payload.data_yaml)
    if not res.get("valid"):
        raise HTTPException(status_code=400, detail=res.get("error"))

    return ResponseEnvelope(
        success=True,
        message="Dataset validated successfully.",
        data=res,
        request_id=request_id
    )


def _execute_training_job(task_id: str, payload: TrainModelRequest):
    """Background execution of model training."""
    try:
        TRAINING_TASKS[task_id]["status"] = "TRAINING"
        trainer = VisionModelTrainer()
        result = trainer.train(
            data_yaml=payload.data_yaml,
            model_name=payload.model_name,
            epochs=payload.epochs,
            imgsz=payload.imgsz,
            batch_size=payload.batch_size,
            learning_rate=payload.learning_rate,
            patience=payload.patience
        )
        if result.get("success"):
            TRAINING_TASKS[task_id]["status"] = "COMPLETED"
            TRAINING_TASKS[task_id]["result"] = result
        else:
            TRAINING_TASKS[task_id]["status"] = "FAILED"
            TRAINING_TASKS[task_id]["error"] = result.get("error")
    except Exception as e:
        logger.error(f"Background training task {task_id} failed: {e}")
        TRAINING_TASKS[task_id]["status"] = "FAILED"
        TRAINING_TASKS[task_id]["error"] = str(e)


@router.post("/train", response_model=ResponseEnvelope[Dict[str, Any]])
def train_model(payload: TrainModelRequest, background_tasks: BackgroundTasks, request: Request):
    """
    Kicks off supervised fine-tuning of YOLOv11 on a custom dataset.
    Trains genuine PyTorch model weights on GPU, generates evaluation metrics,
    and registers the model in the platform model registry.
    """
    request_id = getattr(request.state, "request_id", "N/A")

    # Validate dataset existence
    val = DatasetManager.validate_dataset(payload.data_yaml)
    if not val.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start training. Dataset validation failed: {val.get('error')}"
        )

    task_id = str(uuid.uuid4())
    TRAINING_TASKS[task_id] = {
        "task_id": task_id,
        "model_name": payload.model_name,
        "epochs": payload.epochs,
        "batch_size": payload.batch_size,
        "data_yaml": payload.data_yaml,
        "status": "QUEUED",
        "result": None,
        "error": None
    }

    background_tasks.add_task(_execute_training_job, task_id, payload)

    return ResponseEnvelope(
        success=True,
        message=f"Model training task '{payload.model_name}' launched in background.",
        data={
            "task_id": task_id,
            "status": "QUEUED",
            "model_name": payload.model_name,
            "epochs": payload.epochs,
            "classes": val.get("classes", [])
        },
        request_id=request_id
    )


@router.get("/train/status/{task_id}", response_model=ResponseEnvelope[Dict[str, Any]])
def get_training_status(task_id: str, request: Request):
    """Returns status and results of a training job."""
    request_id = getattr(request.state, "request_id", "N/A")
    task = TRAINING_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Training task {task_id} not found.")

    return ResponseEnvelope(
        success=True,
        message=f"Training task status: {task['status']}",
        data=task,
        request_id=request_id
    )


@router.post("/activate/{model_id}", response_model=ResponseEnvelope[Dict[str, Any]])
def activate_model(model_id: str, request: Request):
    """
    Activates a specific registered model for the pipeline.
    If it is a YOLO model, hot-reloads the YOLO detector with the model's trained weights.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        model = uow.model_registry.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model with ID {model_id} not found.")

        # Set all same-type models to INACTIVE and this one to ACTIVE
        all_models = uow.model_registry.list()
        for m in all_models:
            if m.model_type == model.model_type:
                m.status = "INACTIVE"
        model.status = "ACTIVE"
        uow.commit()

        # If model has weights path, hot-reload into detector
        if model.model_path and os.path.exists(model.model_path):
            vision_service = Container.get_vision_service()
            # If fallback is YOLO or vision_service is YOLO
            if hasattr(vision_service, "load_weights"):
                vision_service.load_weights(model.model_path)
            elif hasattr(vision_service, "fallback_detector") and hasattr(vision_service.fallback_detector, "load_weights"):
                vision_service.fallback_detector.load_weights(model.model_path)

    return ResponseEnvelope(
        success=True,
        message=f"Model '{model.model_name}' (ID: {model_id}) activated successfully.",
        data={
            "id": model.id,
            "model_name": model.model_name,
            "status": "ACTIVE",
            "model_path": model.model_path
        },
        request_id=request_id
    )
