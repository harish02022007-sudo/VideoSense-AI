import time
import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.core.container import Container
from app.core.constants import PipelineStage, JobStatus
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Job, Frame, OCRResult, Transcript, Scene, Object, Audio, FaceDetection
from app.models.pipeline import PipelineExecution
from app.models.embedding import VideoEmbedding
from app.processing.pipeline_context import PipelineContext
from app.processing.progress_tracker import ProgressTracker
from app.processing.checkpoints import CheckpointManager
from app.processing.error_handler import PipelineErrorHandler
from app.processing.events import PipelineEventBus, ProcessingStartedEvent, StageCompletedEvent
from app.core.logging import get_logger

logger = get_logger("app.processing.pipeline")

class PipelineService:
    """Orchestrates sequential AI ingestion pipelines, handling checkpoint saves and database integrations."""
    
    @classmethod
    def execute_pipeline(
        cls,
        video_id: str,
        job_id: str,
        correlation_id: str,
        config: Dict[str, Any]
    ) -> None:
        context = PipelineContext(
            video_id=video_id,
            job_id=job_id,
            correlation_id=correlation_id,
            initial_config=config
        )

        # 1. Initialize processing job state
        with UnitOfWork() as uow:
            job = uow.jobs.get(job_id)
            if job:
                job.status = "processing"
                job.started_at = datetime.utcnow()
            uow.commit()

        PipelineEventBus.publish(ProcessingStartedEvent(
            correlation_id=correlation_id,
            video_id=video_id,
            job_id=job_id,
            priority=config.get("priority", 0),
            processing_config=config
        ))

        # Get video filepath
        with UnitOfWork() as uow:
            video = uow.videos.get(video_id)
            if not video:
                PipelineErrorHandler.handle_stage_failure(
                    context, PipelineStage.METADATA, 1, "VIDEO_NOT_FOUND", "Video record not found in database."
                )
                return
            video_path = video.filepath

        # -------------------------------------------------------------
        # STAGE 1: METADATA EXTRACTION
        # -------------------------------------------------------------
        stage = PipelineStage.METADATA
        ProgressTracker.update_stage_progress(context, stage, 1)
        start_time = time.time()
        
        meta_service = Container.get_metadata_service()
        meta_res = meta_service.extract_metadata(video_path)
        elapsed = int((time.time() - start_time) * 1000)
        
        if not meta_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 1, "METADATA_FAILED", meta_res.error, elapsed)
            return

        # Update metadata properties in database
        meta = meta_res.value
        with UnitOfWork() as uow:
            v_rec = uow.videos.get(video_id)
            if v_rec:
                v_rec.duration = meta.get("duration")
                v_rec.fps = meta.get("fps")
                v_rec.width = meta.get("width")
                v_rec.height = meta.get("height")
                v_rec.codec = meta.get("codec")
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 1, "SUCCESS", 0, 10, elapsed, metadata=meta
        )

        # -------------------------------------------------------------
        # STAGE 2: FRAME EXTRACTION (FFmpeg Slices)
        # -------------------------------------------------------------
        stage = PipelineStage.FRAME_EXTRACTION
        ProgressTracker.update_stage_progress(context, stage, 2)
        start_time = time.time()

        frames_dir = os.path.join(os.path.dirname(video_path), "frames") if "os" in globals() else f"./uploads/{video_id}/frames"
        import os
        frames_dir = os.path.abspath(os.path.join(settings.storage.upload_dir if "settings" in globals() else "./uploads", video_id, "frames"))
        
        # Override directory mapping safely
        from app.core.config import settings
        frames_dir = os.path.abspath(os.path.join(settings.storage.upload_dir, video_id, "frames"))
        
        frame_extractor = Container.get_frame_extractor()
        interval = config.get("frame_interval", 1.0)
        frame_res = frame_extractor.extract_frames(video_path, frames_dir, interval)
        elapsed = int((time.time() - start_time) * 1000)

        if not frame_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 2, "FRAME_EXTRACTION_FAILED", frame_res.error, elapsed)
            return

        frame_paths = frame_res.value
        # Register Frame rows in database
        with UnitOfWork() as uow:
            for idx, fp in enumerate(frame_paths):
                # Calculate simple timestamp offset from frame index and interval
                timestamp_offset = idx * interval * 1000.0
                frame_entity = Frame(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    frame_number=idx + 1,
                    timestamp_offset_ms=timestamp_offset,
                    filepath=fp,
                    extraction_status="completed",
                    is_keyframe=True
                )
                uow.frames.add(frame_entity)
                context.add_artifact("frames", fp)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 2, "SUCCESS", 10, 25, elapsed, metadata={"frames_count": len(frame_paths)}
        )

        # -------------------------------------------------------------
        # STAGE 3: AUDIO EXTRACTION (FFmpeg Strip)
        # -------------------------------------------------------------
        stage = PipelineStage.AUDIO_EXTRACTION
        ProgressTracker.update_stage_progress(context, stage, 3)
        start_time = time.time()

        audio_wav = os.path.abspath(os.path.join(settings.storage.upload_dir, video_id, "audio", "audio.wav"))
        audio_extractor = Container.get_audio_extractor()
        audio_res = audio_extractor.extract_audio(video_path, audio_wav)
        elapsed = int((time.time() - start_time) * 1000)

        if not audio_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 3, "AUDIO_EXTRACTION_FAILED", audio_res.error, elapsed)
            return

        # Register Audio row in database
        with UnitOfWork() as uow:
            audio_entity = Audio(
                id=str(uuid.uuid4()),
                video_id=video_id,
                filepath=audio_wav,
                sample_rate=16000,
                channels=1
            )
            uow.audio.add(audio_entity)
            context.add_artifact("audio", audio_wav)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 3, "SUCCESS", 25, 40, elapsed, metadata={"audio_path": audio_wav}
        )

        # -------------------------------------------------------------
        # STAGE 4: SCENE DETECTION (PySceneDetect cuts)
        # -------------------------------------------------------------
        stage = PipelineStage.SCENE_DETECTION
        ProgressTracker.update_stage_progress(context, stage, 4)
        start_time = time.time()

        scene_detector = Container.get_scene_detector()
        scene_res = scene_detector.detect_scenes(video_path)
        elapsed = int((time.time() - start_time) * 1000)

        if not scene_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 4, "SCENE_DETECTION_FAILED", scene_res.error, elapsed)
            return

        scenes_list = scene_res.value
        with UnitOfWork() as uow:
            for s in scenes_list:
                scene_entity = Scene(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    scene_number=s["scene_number"],
                    start_time_ms=s["start_time_ms"],
                    end_time_ms=s["end_time_ms"]
                )
                uow.scenes.add(scene_entity)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 4, "SUCCESS", 40, 55, elapsed, metadata={"scenes_count": len(scenes_list)}
        )

        # -------------------------------------------------------------
        # STAGE 5: OCR SCAN (EasyOCR scans)
        # -------------------------------------------------------------
        stage = PipelineStage.OCR
        ProgressTracker.update_stage_progress(context, stage, 5)
        start_time = time.time()

        ocr_service = Container.get_ocr_service()
        ocr_res = ocr_service.extract_text(frame_paths)
        elapsed = int((time.time() - start_time) * 1000)

        if not ocr_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 5, "OCR_FAILED", ocr_res.error, elapsed)
            return

        ocr_list = ocr_res.value
        with UnitOfWork() as uow:
            # Map ocr frame path back to saved frame entity ID
            db_frames = uow.frames.get_by_video_id(video_id)
            frame_map = {f.filepath: f.id for f in db_frames}
            
            for o in ocr_list:
                frame_id = frame_map.get(o["frame_path"])
                ocr_entity = OCRResult(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    frame_id=frame_id,
                    text=o["text"],
                    confidence=o["confidence"],
                    box_x_min=o["box_x_min"],
                    box_y_min=o["box_y_min"],
                    box_x_max=o["box_x_max"],
                    box_y_max=o["box_y_max"],
                    language=o["language"],
                    frame_timestamp=o["frame_timestamp"]
                )
                uow.ocr_results.add(ocr_entity)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 5, "SUCCESS", 55, 70, elapsed, metadata={"ocr_count": len(ocr_list)}
        )

        # -------------------------------------------------------------
        # STAGE 6: SPEECH RECOGNITION (Whisper Transcripts)
        # -------------------------------------------------------------
        stage = PipelineStage.SPEECH
        ProgressTracker.update_stage_progress(context, stage, 6)
        start_time = time.time()

        speech_service = Container.get_speech_service()
        speech_res = speech_service.transcribe(audio_wav)
        elapsed = int((time.time() - start_time) * 1000)

        if not speech_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 6, "SPEECH_FAILED", speech_res.error, elapsed)
            return

        speech_list = speech_res.value
        with UnitOfWork() as uow:
            for seg in speech_list:
                transcript_entity = Transcript(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    text=seg["text"],
                    confidence=seg["confidence"],
                    start_time_ms=seg["start_time_ms"],
                    end_time_ms=seg["end_time_ms"],
                    speaker_label=seg.get("speaker_label"),
                    language=seg.get("language")
                )
                uow.transcripts.add(transcript_entity)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 6, "SUCCESS", 70, 82, elapsed, metadata={"transcripts_count": len(speech_list)}
        )

        # -------------------------------------------------------------
        # STAGE 7: OBJECT DETECTION (YOLOv11 tracking)
        # -------------------------------------------------------------
        stage = PipelineStage.OBJECT_DETECTION
        ProgressTracker.update_stage_progress(context, stage, 7)
        start_time = time.time()

        vision_service = Container.get_vision_service()
        vision_res = vision_service.detect_objects(frame_paths)
        elapsed = int((time.time() - start_time) * 1000)

        if not vision_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 7, "OBJECT_DETECTION_FAILED", vision_res.error, elapsed)
            return

        objects_list = vision_res.value
        with UnitOfWork() as uow:
            # Map object frame path back to saved frame entity ID
            db_frames = uow.frames.get_by_video_id(video_id)
            frame_map = {f.filepath: f.id for f in db_frames}
            
            for obj in objects_list:
                frame_id = frame_map.get(obj["frame_path"])
                object_entity = Object(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    frame_id=frame_id,
                    class_label=obj["class_label"],
                    confidence=obj["confidence"],
                    box_x_min=obj["box_x_min"],
                    box_y_min=obj["box_y_min"],
                    box_x_max=obj["box_x_max"],
                    box_y_max=obj["box_y_max"],
                    tracking_id=obj["tracking_id"],
                    first_seen_timestamp=obj["first_seen_timestamp"],
                    last_seen_timestamp=obj["last_seen_timestamp"]
                )
                uow.objects.add(object_entity)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 7, "SUCCESS", 82, 94, elapsed, metadata={"objects_count": len(objects_list)}
        )

        # -------------------------------------------------------------
        # STAGE 8: FACE DETECTION & EMBEDDING PLACEHOLDERS
        # -------------------------------------------------------------
        # Add basic placeholder entries for vectors & face bounding box architecture readiness
        with UnitOfWork() as uow:
            mock_emb = VideoEmbedding(
                id=str(uuid.uuid4()),
                video_id=video_id,
                embedding_type="VIDEO",
                vector_reference=f"/uploads/{video_id}/analysis/video_emb.bin",
                model_name="clip-ViT-B-32",
                dimension=512
            )
            uow.video_embeddings.add(mock_emb)
            uow.commit()

        # -------------------------------------------------------------
        # STAGE 9: COMPLETED
        # -------------------------------------------------------------
        stage = PipelineStage.COMPLETED
        ProgressTracker.update_stage_progress(context, stage, 9, elapsed)

        logger.info(
            f"Pipeline completed successfully for job {job_id}"
        )

        with UnitOfWork() as uow:
            job = uow.jobs.get(job_id)
            if job:
                job.status = "completed"
                job.completed_at = datetime.utcnow()
            uow.commit()