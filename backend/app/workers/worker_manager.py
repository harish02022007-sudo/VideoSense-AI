import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from app.db.unit_of_work import UnitOfWork
from app.models.worker import Worker
from app.processing.pipeline import PipelineService
from app.core.logging import get_logger

logger = get_logger("app.workers.manager")

class WorkerManager:
    """Manages active job queues, worker registrations, and runs pipeline tasks in a background thread."""
    _queue: asyncio.Queue = None
    _active_worker_id: Optional[str] = None
    _worker_loop_task: Optional[asyncio.Task] = None
    _loop: asyncio.AbstractEventLoop | None = None

    @classmethod
    async def start_worker(cls) -> None:
        """Registers a worker record and starts polling the job queue."""
        cls._loop = asyncio.get_running_loop()
        cls._queue = asyncio.Queue()
        cls._active_worker_id = f"worker_{str(uuid.uuid4())[:8]}"
        
        logger.info(f"Starting background worker: {cls._active_worker_id}")

        with UnitOfWork() as uow:
            # Register worker in DB
            db_worker = Worker(
                id=cls._active_worker_id,
                name=f"local_async_worker_1",
                status="idle"
            )
            uow.workers.add(db_worker)
            uow.commit()

        # Launch active loop
        cls._worker_loop_task = asyncio.create_task(cls._worker_loop())
        # Spawn concurrent heartbeat updater task
        asyncio.create_task(cls._heartbeat_loop())

    @classmethod
    async def enqueue_job(cls, video_id: str, job_id: str, config: Dict[str, Any]) -> None:
        """Appends a new job target descriptor to the async queue."""
        logger.info(f"Enqueuing job {job_id} for video {video_id}")
        await cls._queue.put({
            "video_id": video_id,
            "job_id": job_id,
            "config": config
        })

    @classmethod
    def enqueue_job_threadsafe(
        cls,
        video_id: str,
        job_id: str,
        config: Dict[str, Any]
    ) -> None:
        """
        Safely enqueue a job from a non-async thread.
        """

        if cls._loop is None:
            raise RuntimeError("Worker event loop has not been initialized.")

        future = asyncio.run_coroutine_threadsafe(
            cls.enqueue_job(video_id, job_id, config),
            cls._loop
        )

        future.result()

    @classmethod
    async def _worker_loop(cls) -> None:
        """Continuously pulls and executes enqueued jobs from the FIFO list."""
        while True:
            try:
                job_data = await cls._queue.get()
                video_id = job_data["video_id"]
                job_id = job_data["job_id"]
                config = job_data["config"]

                logger.info(f"Worker {cls._active_worker_id} picking up job {job_id}")
                
                # Update worker status to active in DB
                with UnitOfWork() as uow:
                    w = uow.workers.get(cls._active_worker_id)
                    if w:
                        w.status = "active"
                        w.current_job_id = job_id
                    job = uow.jobs.get(job_id)
                    if job:
                        job.worker_id = cls._active_worker_id
                    uow.commit()

                # Run pipeline synchronously in this background worker thread context
                try:
                    # Run in loop execution thread to prevent event loop blocks
                    loop = asyncio.get_running_loop()
                    await loop.run_in_executor(
                        None,
                        PipelineService.execute_pipeline,
                        video_id,
                        job_id,
                        config.get("correlation_id", "N/A"),
                        config
                    )
                except Exception as e:
                    logger.error(f"Pipeline service execute exception: {str(e)}")

                # Reset worker status to idle
                with UnitOfWork() as uow:
                    w = uow.workers.get(cls._active_worker_id)
                    if w:
                        w.status = "idle"
                        w.current_job_id = None
                    uow.commit()

                cls._queue.task_done()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in worker pipeline loop: {str(e)}")
                await asyncio.sleep(2.0)

    @classmethod
    async def _heartbeat_loop(cls) -> None:
        """Periodic loop refreshing the worker's active heartbeat timestamp."""
        while True:
            try:
                await asyncio.sleep(10.0)
                if cls._active_worker_id:
                    with UnitOfWork() as uow:
                        w = uow.workers.get(cls._active_worker_id)
                        if w:
                            w.last_heartbeat_at = datetime.utcnow()
                        uow.commit()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {str(e)}")
