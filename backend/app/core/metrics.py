import time
from typing import Dict, Any

class PipelineMetrics:
    """Aggregates and tracks performance timing metrics for the active pipeline run."""
    _metrics: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def start_timer(cls, job_id: str, stage: str) -> None:
        key = f"{job_id}:{stage}"
        cls._metrics[key] = {
            "start_time": time.time(),
            "stage": stage,
            "job_id": job_id
        }

    @classmethod
    def stop_timer(cls, job_id: str, stage: str) -> int:
        key = f"{job_id}:{stage}"
        if key in cls._metrics:
            metrics = cls._metrics[key]
            elapsed_ms = int((time.time() - metrics["start_time"]) * 1000)
            metrics["duration_ms"] = elapsed_ms
            return elapsed_ms
        return 0

    @classmethod
    def get_stage_metrics(cls, job_id: str, stage: str) -> Dict[str, Any]:
        key = f"{job_id}:{stage}"
        return cls._metrics.get(key, {})
