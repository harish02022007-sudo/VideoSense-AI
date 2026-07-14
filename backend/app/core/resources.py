import psutil
from typing import Dict, Any

class ResourceManager:
    """Monitors system hardware capabilities (CPU, RAM, GPU, VRAM) to support intelligent model selection."""
    @staticmethod
    def get_gpu_availability() -> bool:
        """Determines if a CUDA GPU is accessible for hardware-accelerated processing."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    @staticmethod
    def get_system_metrics() -> Dict[str, Any]:
        """Resolves system CPU load and physical memory consumption statistics."""
        virtual_mem = psutil.virtual_memory()
        metrics = {
            "cpu_percent": psutil.cpu_percent(interval=None),
            "ram_used_mb": virtual_mem.used // (1024 * 1024),
            "ram_total_mb": virtual_mem.total // (1024 * 1024),
            "ram_percent": virtual_mem.percent,
            "gpu_available": ResourceManager.get_gpu_availability()
        }

        # Check GPU memory details if torch CUDA is active
        if metrics["gpu_available"]:
            try:
                import torch
                device = torch.cuda.current_device()
                metrics["gpu_name"] = torch.cuda.get_device_name(device)
                metrics["vram_allocated_mb"] = torch.cuda.memory_allocated(device) // (1024 * 1024)
                metrics["vram_cached_mb"] = torch.cuda.memory_reserved(device) // (1024 * 1024)
            except Exception:
                pass

        return metrics
