import os
import uuid
import time
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.db.unit_of_work import UnitOfWork
from app.core.config import settings
from app.core.container import Container
from app.models.embedding import VideoEmbedding
from app.models.processing_log import ProcessingLog
from app.core.constants import PipelineStage, EmbeddingType
from app.core.constants import EMBEDDING_PENDING, EMBEDDING_PROCESSING, EMBEDDING_COMPLETED, EMBEDDING_FAILED
from app.core.logging import get_logger

logger = get_logger("app.workers.embedding_worker")

class EmbeddingWorker:
    """Worker class to run embedding generation asynchronously in a background thread."""

    @classmethod
    def start_embedding_task(cls, video_id: str, job_id: str, correlation_id: str) -> None:
        """Spawns a thread or starts the task asynchronously."""
        import threading
        thread = threading.Thread(
            target=cls.process_embedding_job,
            args=(video_id, job_id, correlation_id),
            daemon=True
        )
        thread.start()
        logger.info(f"Spawned background embedding thread for video {video_id}")

    @classmethod
    def process_embedding_job(cls, video_id: str, job_id: str, correlation_id: str) -> None:
        """Retrieves video analysis data, encodes all modalities, and commits embeddings."""
        logger.info(f"Starting background embedding job {job_id} for video {video_id}")
        
        # 1. Update job stage status in database
        with UnitOfWork() as uow:
            job = uow.jobs.get(job_id)
            if job:
                job.current_stage = "embedding_generation"
                job.status = EMBEDDING_PROCESSING
            
            # Create starting log
            log = ProcessingLog(
                id=str(uuid.uuid4()),
                video_id=video_id,
                job_id=job_id,
                stage="embedding_generation",
                level="INFO",
                message="Generating text embeddings",
                log_metadata={"status": EMBEDDING_PROCESSING}
            )
            uow.processing_logs.add(log)
            uow.commit()

        try:
            # 2. Load services from Container
            embedding_service = Container.get_embedding_service()
            vector_storage = Container.get_vector_storage()

            # Retrieve text elements
            with UnitOfWork() as uow:
                transcripts = uow.transcripts.get_by_video_id(video_id)
                ocr_results = uow.ocr_results.get_by_video_id(video_id)
                objects_list = uow.objects.get_by_video_id(video_id)
                db_frames = uow.frames.get_by_video_id(video_id)
                video_rec = uow.videos.get(video_id)

                if not transcripts:
                    logger.info(
                        f"No transcripts found for video {video_id}. Skipping AUDIO embeddings."
                    )

            # --- A. TEXT EMBEDDING ---
            transcripts_text = " ".join([t.text for t in transcripts if t.text])
            ocr_text = " ".join([o.text for o in ocr_results if o.text])
            combined_text = (transcripts_text + " " + ocr_text).strip()
            if not combined_text:
                combined_text = video_rec.filename if video_rec else "video"

            text_vector = np.array(embedding_service.generate_text_embedding(combined_text), dtype=np.float32)
            text_ref = vector_storage.save_vector(video_id, "text", text_vector)

            logger.info(
                f"TEXT embedding created: shape={text_vector.shape}, reference={text_ref}"
            )

            # Log stage update
            with UnitOfWork() as uow:
                log = ProcessingLog(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    job_id=job_id,
                    stage="embedding_generation",
                    level="INFO",
                    message="Generating frame embeddings",
                    log_metadata={"status": EMBEDDING_PROCESSING}
                )
                uow.processing_logs.add(log)
                uow.commit()

            # --- B. FRAME EMBEDDING ---
            # Sort frames by frame_number to ensure consistency
            sorted_frames = sorted(db_frames, key=lambda f: f.frame_number)
            frame_embeddings = []
            frame_meta = []
            
            for idx, frame in enumerate(sorted_frames):
                emb = embedding_service.generate_frame_embedding(frame.filepath)
                frame_embeddings.append(emb)
                frame_meta.append({
                    "frame_index": idx,
                    "timestamp": frame.timestamp_offset_ms / 1000.0 if frame.timestamp_offset_ms else 0.0,
                    "path": frame.filepath
                })

            if not frame_embeddings:
                # Save a placeholder zero vector if no frames exist
                frame_vectors = np.zeros((0, 512), dtype=np.float32)
            else:
                frame_vectors = np.array(frame_embeddings, dtype=np.float32)

            frame_ref = vector_storage.save_vector(video_id, "frame", frame_vectors, metadata=frame_meta)

            logger.info(
                f"FRAME embedding created: shape={frame_vectors.shape}, reference={frame_ref}"
            )

            # --- C. AUDIO SEGMENT EMBEDDINGS ---

            audio_segments = [] 
            if transcripts:

                for index, segment in enumerate(transcripts):

                    text = segment.text.strip()

                    if not text:
                        continue

                    vector = np.array(
                        embedding_service.generate_audio_embedding(text),
                        dtype=np.float32
                    )

                    audio_ref = vector_storage.save_vector(
                        video_id,
                        f"audio_{index}",
                        vector
                    )

                    audio_segments.append({
                        "segment_id": index,
                        "text": text,
                        "start_time_ms": segment.start_time_ms,
                        "end_time_ms": segment.end_time_ms,
                        "vector_reference": audio_ref
                    })

                    logger.info(
                        f"AUDIO segment embedding created: segment={index}"
                    )

            # --- D. VIDEO METADATA EMBEDDING ---
            # Aggregate metadata descriptors
            duration = video_rec.duration if video_rec and video_rec.duration else 0.0
            fps = video_rec.fps if video_rec and video_rec.fps else 0
            width = video_rec.width if video_rec and video_rec.width else 0
            height = video_rec.height if video_rec and video_rec.height else 0
            codec = video_rec.codec if video_rec and video_rec.codec else "unknown"
            
            unique_objects = list(set([obj.class_label for obj in objects_list if obj.class_label]))
            objects_str = ", ".join(unique_objects) if unique_objects else "none"
            
            metadata_str = (
                f"Video details: Duration: {duration:.2f}s, FPS: {fps}, Size: {width}x{height}, Codec: {codec}. "
                f"Detected objects list: {objects_str}. "
                f"OCR snippet: {ocr_text[:300]}."
            )
            metadata_vector = np.array(embedding_service.generate_metadata_embedding(metadata_str), dtype=np.float32)
            meta_ref = vector_storage.save_vector(video_id, "metadata", metadata_vector)

            logger.info(
                f"METADATA embedding created: shape={metadata_vector.shape}, reference={meta_ref}"
            )

            # --- E. SAVE DATABASE RECORDS ---
            with UnitOfWork() as uow:
                # Clean up existing embeddings for this video to avoid duplicates
                existing_embs = uow.video_embeddings.get_by_video_id(video_id)
                for e in existing_embs:
                    uow.session.delete(e)
                uow.commit()

            with UnitOfWork() as uow:
                # 1. Text embedding record
                text_emb = VideoEmbedding(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    embedding_type="TEXT",
                    vector_reference=text_ref,
                    model_name=settings.embeddings.text_model,
                    dimension=384,
                    embedding_model_version="1.0"
                )
                uow.video_embeddings.add(text_emb)

                # 2. Frame embedding record
                frame_emb = VideoEmbedding(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    embedding_type="FRAME",
                    vector_reference=frame_ref,
                    model_name=settings.embeddings.vision_model,
                    dimension=512,
                    embedding_model_version="1.0"
                )
                uow.video_embeddings.add(frame_emb)

                # 3. Audio embedding record
                for segment in audio_segments:

                    audio_emb = VideoEmbedding(
                        id=str(uuid.uuid4()),
                        video_id=video_id,
                        embedding_type="AUDIO",
                        vector_reference=segment["vector_reference"],
                        model_name=settings.embeddings.text_model,
                        dimension=384,
                        embedding_model_version="1.0"
                    )

                    uow.video_embeddings.add(audio_emb)

                # 4. Metadata embedding record
                metadata_emb = VideoEmbedding(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    embedding_type="VIDEO_METADATA",
                    vector_reference=meta_ref,
                    model_name=settings.embeddings.text_model,
                    dimension=384,
                    embedding_model_version="1.0"
                )
                uow.video_embeddings.add(metadata_emb)

                # Update job status and stage
                job = uow.jobs.get(job_id)
                if job:
                    job.current_stage = "completed"
                    job.status = EMBEDDING_COMPLETED
                
                # Write log completion
                log = ProcessingLog(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    job_id=job_id,
                    stage="embedding_generation",
                    level="INFO",
                    message="Embedding completed",
                    log_metadata={"status": EMBEDDING_COMPLETED}
                )
                uow.processing_logs.add(log)
                uow.commit()

            logger.info(f"Asynchronous embedding worker completed successfully for video {video_id}")

        except Exception as e:
            logger.error(f"Error in background embedding worker: {str(e)}", exc_info=True)
            with UnitOfWork() as uow:
                job = uow.jobs.get(job_id)
                if job:
                    job.status = EMBEDDING_FAILED
                    job.error_message = f"Embedding stage failed: {str(e)}"
                
                log = ProcessingLog(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    job_id=job_id,
                    stage="embedding_generation",
                    level="ERROR",
                    message=f"Embedding failed: {str(e)}",
                    log_metadata={"status": EMBEDDING_FAILED}
                )
                uow.processing_logs.add(log)
                uow.commit()