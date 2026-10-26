import os
from app.db.unit_of_work import UnitOfWork
from app.models.model_registry import ModelRegistry


def initialize_model_registry() -> None:
    """
    Registers available AI models into the model registry database,
    ensuring only valid, official pre-trained models are marked ACTIVE.
    """
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.abspath(os.path.join(curr_dir, "..", ".."))
    yolo_path = os.path.join(backend_dir, "models", "weights", "yolo11m.pt")
    if not os.path.exists(yolo_path):
        yolo_path = os.path.join(backend_dir, "yolo11m.pt")

    models = [
        ModelRegistry(
            id="yolo11m",
            model_name="YOLOv11 Medium",
            model_type="OBJECT_DETECTION",
            version="11",
            provider="ultralytics",
            status="ACTIVE",
            model_path=yolo_path if os.path.exists(yolo_path) else "yolo11m.pt",
            hardware_requirement="CPU/GPU",
            memory_requirement="2GB"
        ),

        ModelRegistry(
            id="whisper-tiny",
            model_name="Whisper Tiny",
            model_type="SPEECH_RECOGNITION",
            version="1.0.0",
            provider="faster-whisper",
            status="ACTIVE",
            hardware_requirement="CPU",
            memory_requirement="1GB"
        ),

        ModelRegistry(
            id="easyocr",
            model_name="EasyOCR",
            model_type="OCR",
            version="1.0.0",
            provider="easyocr",
            status="ACTIVE",
            hardware_requirement="CPU/GPU",
            memory_requirement="1GB"
        )
    ]

    with UnitOfWork() as uow:
        # Purge or deactivate any custom models whose weight files no longer exist
        all_registered = uow.model_registry.list()
        for reg in all_registered:
            if reg.model_type == "OBJECT_DETECTION" and reg.id != "yolo11m":
                if not reg.model_path or not os.path.exists(reg.model_path):
                    uow.model_registry.delete(reg.id)

        for model in models:
            existing = uow.model_registry.get_by_name(model.model_name)
            if not existing:
                uow.model_registry.add(model)
            else:
                existing.status = "ACTIVE"
                if model.model_path:
                    existing.model_path = model.model_path

        uow.commit()