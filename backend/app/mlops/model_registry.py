from app.db.unit_of_work import UnitOfWork
from app.models.model_registry import ModelRegistry


def initialize_model_registry() -> None:
    """
    Registers available AI models into the model registry database.
    """

    models = [
        ModelRegistry(
            id="yolo-v8-nano",
            model_name="YOLOv8 Nano",
            model_type="OBJECT_DETECTION",
            version="8.3.0",
            provider="ultralytics",
            status="ACTIVE",
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

        for model in models:

            existing = uow.model_registry.get_by_name(
                model.model_name
            )

            if not existing:
                uow.model_registry.add(model)

        uow.commit()