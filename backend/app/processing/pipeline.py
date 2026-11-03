import os
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List

from app.core.config import settings
from app.core.container import Container
from app.db.unit_of_work import UnitOfWork
from app.models.processing_log import ProcessingLog
from app.core.constants import PipelineStage, JobStatus
from app.processing.pipeline_context import PipelineContext
from app.processing.progress_tracker import ProgressTracker
from app.processing.checkpoints import CheckpointManager
from app.processing.error_handler import PipelineErrorHandler
from app.processing.events import PipelineEventBus, ProcessingStartedEvent, StageCompletedEvent
from app.core.logging import get_logger
from app.models.analysis import Video, Job, Frame, OCRResult, Transcript, Scene, Object, Audio, FaceDetection
from app.models.pipeline import PipelineExecution
from app.models.embedding import VideoEmbedding
from app.workers.embedding_worker import EmbeddingWorker

logger = get_logger("app.processing.pipeline")

class PipelineService:
    """Orchestrates sequential AI ingestion pipelines, handling checkpoint saves and database integrations."""

    @staticmethod
    def create_processing_log(
        video_id: str,
        job_id: str,
        stage: str
    ):
        with UnitOfWork() as uow:
            log = ProcessingLog(
                id=str(uuid.uuid4()),
                video_id=video_id,
                job_id=job_id,
                stage=stage,
                level="INFO",
                message=f"{stage} completed successfully",
                log_metadata={
                    "stage": stage,
                    "status": "completed"
                }
            )
            uow.processing_logs.add(log)
            uow.commit()

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
            video_user_id = video.user_id
            video_filename = video.filename

        # Emit pipeline started event
        try:
            from app.services.notification_service import NotificationService
            NotificationService.create_notification(
                event_id=f"job_{job_id}_started",
                event_type="pipeline_started",
                category="processing",
                title="Video Analysis Started",
                message=f'AI analysis pipeline started for "{video_filename}". Processing jobs are now actively running.',
                severity="info",
                user_id=video_user_id,
                resource_type="video",
                resource_id=video_id,
                action_tab="player",
                action_label="View Processing",
                metadata={"jobId": job_id, "videoTitle": video_filename}
            )
        except Exception as notif_err:
            logger.warning(f"Could not dispatch pipeline_started notification: {notif_err}")

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

        cls.create_processing_log(
            video_id,
            job_id,
            "metadata_completed"
        )

        # -------------------------------------------------------------
        # STAGE 2: FRAME EXTRACTION (FFmpeg Slices)
        # -------------------------------------------------------------
        stage = PipelineStage.FRAME_EXTRACTION
        ProgressTracker.update_stage_progress(context, stage, 2)
        start_time = time.time()

        frames_dir = os.path.abspath(
            os.path.join(
                settings.storage.upload_dir,
                video_id,
                "frames"
            )
        )
        
        os.makedirs(frames_dir, exist_ok=True)
        frame_extractor = Container.get_frame_extractor()
        interval = config.get("frame_interval", 1.0)
        frame_res = frame_extractor.extract_frames(video_path, frames_dir, interval)
        elapsed = int((time.time() - start_time) * 1000)

        if not frame_res.success:
            PipelineErrorHandler.handle_stage_failure(context, stage, 2, "FRAME_EXTRACTION_FAILED", frame_res.error, elapsed)
            return
  
        frame_paths = frame_res.value
        # Register Frame rows in database (and upload to Supabase if configured)
        from app.infrastructure.storage.supabase_storage import supabase_storage
        with UnitOfWork() as uow:
            for idx, fp in enumerate(frame_paths):
                # Calculate accurate timestamp offset from extracted frame sequence index
                try:
                    num_part = os.path.basename(fp).split("_")[1].split(".")[0]
                    seq_num = int(num_part)
                    timestamp_offset = max(0.0, (seq_num - 1) * interval * 1000.0)
                except Exception:
                    timestamp_offset = idx * interval * 1000.0

                frame_filepath = fp
                if supabase_storage.is_enabled:
                    remote_frame_path = f"{video_id}/frames/{os.path.basename(fp)}"
                    cloud_upload = supabase_storage.upload_from_disk(fp, remote_frame_path, "image/jpeg")
                    if cloud_upload.success:
                        frame_filepath = cloud_upload.value

                frame_entity = Frame(
                    id=str(uuid.uuid4()),
                    video_id=video_id,
                    frame_number=idx + 1,
                    timestamp_offset_ms=timestamp_offset,
                    filepath=frame_filepath,
                    extraction_status="completed",
                    is_keyframe=True
                )
                uow.frames.add(frame_entity)
                context.add_artifact("frames", fp)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 2, "SUCCESS", 10, 25, elapsed, metadata={"frames_count": len(frame_paths)}
        )

        cls.create_processing_log(
            video_id,
            job_id,
            "frames_completed"
        )

        # Emit frame extraction event
        try:
            from app.services.notification_service import NotificationService
            NotificationService.create_notification(
                event_id=f"job_{job_id}_frames",
                event_type="frames_extracted",
                category="processing",
                title="Frame Extraction Completed",
                message=f'Frame extraction completed for "{video_filename}". Extracted {len(frame_paths)} keyframes for model inference.',
                severity="info",
                user_id=video_user_id,
                resource_type="video",
                resource_id=video_id,
                action_tab="player",
                action_label="View Frames",
                model_name="FFmpeg Keyframe Sampler",
                metadata={"framesExtracted": len(frame_paths), "intervalSec": interval, "jobId": job_id}
            )
        except Exception as notif_err:
            logger.warning(f"Could not dispatch frames_extracted notification: {notif_err}")

        # -------------------------------------------------------------
        # STAGE 3: AUDIO EXTRACTION (FFmpeg Strip)
        # -------------------------------------------------------------
        stage = PipelineStage.AUDIO_EXTRACTION
        ProgressTracker.update_stage_progress(context, stage, 3)
        start_time = time.time()

        audio_wav = os.path.abspath(os.path.join(settings.storage.upload_dir, video_id, "audio", "audio.wav"))
        os.makedirs(os.path.dirname(audio_wav), exist_ok=True)

        audio_extractor = Container.get_audio_extractor()
        audio_res = audio_extractor.extract_audio(video_path, audio_wav)
        elapsed = int((time.time() - start_time) * 1000)

        # Skip audio processing if the video has no audio stream
        if not audio_res.success:
            if "no audio stream" in audio_res.error.lower():
                logger.warning(f"Video {video_id} has no audio stream. Skipping audio stage.")
                audio_wav = None
            else:
                PipelineErrorHandler.handle_stage_failure(
                    context,
                    stage,
                    3,
                    "AUDIO_EXTRACTION_FAILED",
                    audio_res.error,
                    elapsed
                )
                return

        # Register Audio row in database
        if audio_wav is not None:
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

        else:
            logger.info(f"No audio file generated for video {video_id}. Skipping audio database entry.")

        CheckpointManager.save_checkpoint(
            context, stage, 3, "SUCCESS", 25, 40, elapsed, metadata={"audio_path": audio_wav}
        )

        cls.create_processing_log(
            video_id,
            job_id,
            "audio_completed"
        )

        # -------------------------------------------------------------
        # STAGE 4: SCENE DETECTION (PySceneDetect cuts)
        # -------------------------------------------------------------
        stage = PipelineStage.SCENE_DETECTION
        ProgressTracker.update_stage_progress(context, stage, 4)
        start_time = time.time()

        enable_scenes = config.get("enable_scene_detection", True)
        scenes_list = []
        elapsed = 0

        if not enable_scenes:
            logger.info(f"Scene detection disabled by configuration for video {video_id}. Skipping stage.")
            elapsed = int((time.time() - start_time) * 1000)
        else:
            try:
                scene_detector = Container.get_scene_detector()
                scene_res = scene_detector.detect_scenes(video_path)
                elapsed = int((time.time() - start_time) * 1000)

                if scene_res.success:
                    scenes_list = scene_res.value
                else:
                    logger.warn(f"Scene detection non-success: {scene_res.error}. Continuing with default scene.")
                    scenes_list = [{"scene_number": 1, "start_time_ms": 0.0, "end_time_ms": (meta.get("duration", 10.0) * 1000.0)}]
            except Exception as scene_err:
                logger.warn(f"Scene detection exception for video {video_id}: {scene_err}. Continuing pipeline.")
                scenes_list = [{"scene_number": 1, "start_time_ms": 0.0, "end_time_ms": 10000.0}]
            finally:
                import gc
                gc.collect()

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

        cls.create_processing_log(
            video_id,
            job_id,
            "scene_completed"
        )

        # -------------------------------------------------------------
        # STAGE 5: OCR SCAN (EasyOCR scans)
        # -------------------------------------------------------------
        stage = PipelineStage.OCR
        ProgressTracker.update_stage_progress(context, stage, 5)
        start_time = time.time()

        enable_ocr = config.get("enable_ocr", True)
        ocr_list = []
        elapsed = 0

        if not enable_ocr:
            logger.info(f"OCR disabled by configuration for video {video_id}. Skipping stage.")
        else:
            try:
                ocr_service = Container.get_ocr_service()
                ocr_res = ocr_service.extract_text(frame_paths)
                elapsed = int((time.time() - start_time) * 1000)

                if ocr_res.success:
                    ocr_list = ocr_res.value
                else:
                    logger.warn(f"OCR returned non-success: {ocr_res.error}. Continuing with fallback.")
            except Exception as ocr_err:
                logger.warn(f"OCR stage exception for video {video_id}: {ocr_err}. Continuing pipeline.")
            finally:
                try:
                    ocr_svc = Container.get_ocr_service()
                    if hasattr(ocr_svc, "unload"):
                        ocr_svc.unload()
                except Exception:
                    pass
                import gc
                gc.collect()
                try:
                    import ctypes
                    libc = ctypes.CDLL("libc.so.6")
                    libc.malloc_trim(0)
                except Exception:
                    pass

        logger.info(
            f"OCR detected {len(ocr_list)} text regions for video {video_id}"
        )
        
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

        cls.create_processing_log(
            video_id,
            job_id,
            "ocr_completed"
        )

        # -------------------------------------------------------------
        # STAGE 6: SPEECH RECOGNITION (Whisper Transcripts)
        # -------------------------------------------------------------
        stage = PipelineStage.SPEECH
        ProgressTracker.update_stage_progress(context, stage, 6)
        start_time = time.time()

        enable_audio = config.get("enable_audio", True)
        speech_list = []
        elapsed = 0

        # Skip speech recognition if there is no audio or disabled
        if not enable_audio or not audio_wav or not os.path.exists(audio_wav):
            logger.info(f"Skipping speech recognition for video {video_id} (has_audio={os.path.exists(audio_wav) if audio_wav else False}, enabled={enable_audio}).")
            elapsed = int((time.time() - start_time) * 1000)
        else:
            try:
                speech_service = Container.get_speech_service()
                speech_res = speech_service.transcribe(audio_wav)
                elapsed = int((time.time() - start_time) * 1000)

                if speech_res.success:
                    speech_list = speech_res.value
                else:
                    logger.warn(f"Speech transcription returned non-success: {speech_res.error}. Continuing with fallback.")
            except Exception as speech_err:
                logger.warn(f"Speech transcription exception for video {video_id}: {speech_err}. Continuing pipeline.")
            finally:
                try:
                    sp_svc = Container.get_speech_service()
                    if hasattr(sp_svc, "unload"):
                        sp_svc.unload()
                except Exception:
                    pass
                import gc
                gc.collect()
                try:
                    import ctypes
                    libc = ctypes.CDLL("libc.so.6")
                    libc.malloc_trim(0)
                except Exception:
                    pass

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
            context, stage, 6, "SUCCESS", 70, 82, elapsed, 
            metadata={"transcripts_count": len(speech_list)}
        )

        if not os.path.exists(audio_wav):
            cls.create_processing_log(
                video_id,
                job_id,
                "speech_skipped"
            )
        else:
            cls.create_processing_log(
                video_id,
                job_id,
                "speech_completed"
            )

        # -------------------------------------------------------------
        # STAGE 7: OBJECT DETECTION (YOLOv11 tracking)
        # -------------------------------------------------------------
        stage = PipelineStage.OBJECT_DETECTION
        ProgressTracker.update_stage_progress(context, stage, 7)
        start_time = time.time()

        enable_objects = config.get("enable_objects", True)
        objects_list = []
        elapsed = 0

        if not enable_objects:
            logger.info(f"Object detection disabled by configuration for video {video_id}. Skipping stage.")
            elapsed = int((time.time() - start_time) * 1000)
        else:
            # Dynamically extract contextual domain keywords from video title, transcripts, and OCR
            video_caption = None
            try:
                with UnitOfWork() as uow:
                    v_ent = uow.videos.get(video_id)
                    transcripts = uow.transcripts.get_by_video_id(video_id)
                    ocr_results = uow.ocr_results.get_by_video_id(video_id)

                    context_text = ""
                    if v_ent and v_ent.filename:
                        context_text += " " + v_ent.filename
                    if transcripts:
                        context_text += " " + " ".join([t.text for t in transcripts[:10]])
                    if ocr_results:
                        context_text += " " + " ".join([o.text for o in ocr_results[:10]])

                    import re
                    clean = re.sub(r'\.(mp4|avi|mov|mkv|webm)$', '', context_text, flags=re.IGNORECASE)
                    clean = re.sub(r'#\w+', ' ', clean)
                    clean = re.sub(r'[^\w\s]', ' ', clean)
                    stop_words = {
                        'video', 'whatsapp', 'at', 'pm', 'am', 'test', 'sample', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'of',
                        'for', 'to', 'with', 'vs', 'by', 'from', 'shorts', 'short', 'reels', 'tik', 'tok', 'mini', 'world',
                        'is', 'are', 'was', 'were', 'it', 'this', 'that', 'they', 'we', 'you', 'i', 'he', 'she', 'not', 'so'
                    }
                    kws = [w.lower().strip() for w in clean.split() if len(w.strip()) >= 3 and w.lower().strip() not in stop_words and w.isalpha()]
                    if kws:
                        unique_kws = list(dict.fromkeys(kws))[:12]
                        video_caption = " . ".join(unique_kws)
                        logger.info(f"Generated adaptive vision prompt for {video_id}: {video_caption}")
            except Exception as cap_err:
                logger.warn(f"Failed to extract contextual keywords from video {video_id}: {cap_err}")

            try:
                vision_service = Container.get_vision_service()
                vision_res = vision_service.detect_objects(frame_paths, caption=video_caption)
                elapsed = int((time.time() - start_time) * 1000)

                if vision_res.success:
                    objects_list = vision_res.value
                else:
                    logger.warn(f"Vision detection returned non-success: {vision_res.error}. Continuing with fallback.")
            except Exception as vis_err:
                logger.warn(f"Vision detection exception for video {video_id}: {vis_err}. Continuing pipeline.")
            finally:
                try:
                    vis_svc = Container.get_vision_service()
                    if hasattr(vis_svc, "unload"):
                        vis_svc.unload()
                except Exception:
                    pass
                import gc
                gc.collect()
                try:
                    import ctypes
                    libc = ctypes.CDLL("libc.so.6")
                    libc.malloc_trim(0)
                except Exception:
                    pass
        with UnitOfWork() as uow:
            # Map object frame path back to saved frame entity ID
            db_frames = uow.frames.get_by_video_id(video_id)
            frame_map = {f.filepath: f.id for f in db_frames}
            frame_time_map = {f.filepath: ((f.timestamp_offset_ms or 0.0) / 1000.0) for f in db_frames}
            
            for obj in objects_list:
                frame_id = frame_map.get(obj["frame_path"])
                frame_ts = frame_time_map.get(obj["frame_path"], 0.0)
                obj_ts = obj.get("first_seen_timestamp") or frame_ts
                if obj_ts == 0.0 and frame_ts > 0.0:
                    obj_ts = frame_ts
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
                    first_seen_timestamp=obj_ts,
                    last_seen_timestamp=obj.get("last_seen_timestamp") or obj_ts
                )
                uow.objects.add(object_entity)
            uow.commit()

        CheckpointManager.save_checkpoint(
            context, stage, 7, "SUCCESS", 82, 94, elapsed, metadata={"objects_count": len(objects_list)}
        )

        cls.create_processing_log(
            video_id,
            job_id,
            "objects_completed"
        )

        # Emit object detection event
        try:
            from collections import Counter
            from app.services.notification_service import NotificationService
            label_counts = Counter(o["class_label"] for o in objects_list)
            top_classes = label_counts.most_common(4)
            if top_classes:
                detection_breakdown = ", ".join([f"{cnt} {lbl}" for lbl, cnt in top_classes])
            else:
                detection_breakdown = "0 qualifying detections"

            NotificationService.create_notification(
                event_id=f"job_{job_id}_objects",
                event_type="objects_detected",
                category="processing",
                title="Object Detection Completed",
                message=f'Object perception finished for "{video_filename}". Identified {len(objects_list)} detections ({detection_breakdown}).',
                severity="success" if len(objects_list) > 0 else "info",
                user_id=video_user_id,
                resource_type="video",
                resource_id=video_id,
                action_tab="search",
                action_label="Search Objects",
                model_name="YOLOv11 Object Tracker",
                metadata={
                    "totalDetections": len(objects_list),
                    "uniqueLabels": len(label_counts),
                    "labelBreakdown": dict(top_classes),
                    "jobId": job_id
                }
            )
        except Exception as notif_err:
            logger.warning(f"Could not dispatch objects_detected notification: {notif_err}")


        # -------------------------------------------------------------
        # STAGE 8: PREVIEW & THUMBNAIL GENERATION
        # -------------------------------------------------------------
        stage = PipelineStage.PREVIEW_GENERATION
        ProgressTracker.update_stage_progress(context, stage, 8)
        start_time = time.time()

        preview_generator = Container.get_preview_generator()

        preview_res = preview_generator.generate_preview(
            video_id,
            video_path
        )

        elapsed = int((time.time() - start_time) * 1000)

        if not preview_res.success:
            PipelineErrorHandler.handle_stage_failure(
                context,
                stage,
                8,
                "PREVIEW_GENERATION_FAILED",
                preview_res.error,
                elapsed
            )
            return

        preview_data = preview_res.value

        context.add_artifact("thumbnail", preview_data["thumbnail"])
        context.add_artifact("preview_video", preview_data["preview_video"])

        # Upload generated thumbnail and preview video to Supabase Storage if enabled
        if supabase_storage.is_enabled:
            thumb_path = preview_data.get("thumbnail")
            if thumb_path and os.path.isfile(thumb_path):
                supabase_storage.upload_from_disk(thumb_path, f"{video_id}/thumbnails/thumbnail.jpg", "image/jpeg")
            prev_vid = preview_data.get("preview_video")
            if prev_vid and os.path.isfile(prev_vid):
                supabase_storage.upload_from_disk(prev_vid, f"{video_id}/analysis/preview.mp4", "video/mp4")

        CheckpointManager.save_checkpoint(
            context,
            stage,
            8,
            "SUCCESS",
            94,
            98,
            elapsed,
            metadata=preview_data
        )

        cls.create_processing_log(
            video_id,
            job_id,
            "preview_completed"
        )

        # -------------------------------------------------------------
        # STAGE 9: PIPELINE COMPLETED & ASYNC EMBEDDING TRIGGERS
        # -------------------------------------------------------------
        stage = PipelineStage.COMPLETED
        ProgressTracker.update_stage_progress(context, stage, 9, elapsed)

        logger.info(
            f"Main pipeline completed successfully for job {job_id}. Dispatching asynchronous embedding generation worker."
        )

        cls.create_processing_log(
            video_id,
            job_id,
            "pipeline_completed"
        )

        # Emit pipeline completed event
        try:
            from app.services.notification_service import NotificationService
            with UnitOfWork() as uow:
                f_count = len(uow.frames.get_by_video_id(video_id))
                o_count = len(uow.objects.get_by_video_id(video_id))

            NotificationService.create_notification(
                event_id=f"job_{job_id}_completed",
                event_type="pipeline_completed",
                category="processing",
                title="Video Pipeline Completed",
                message=f'End-to-end multimodal pipeline completed for "{video_filename}". Processed {f_count} frames and indexed {o_count} object detections.',
                severity="success",
                user_id=video_user_id,
                resource_type="video",
                resource_id=video_id,
                action_tab="summary",
                action_label="View Summary",
                model_name="VideoSense Multimodal Engine",
                metadata={
                    "framesProcessed": f_count,
                    "totalDetections": o_count,
                    "jobId": job_id
                }
            )
        except Exception as notif_err:
            logger.warning(f"Could not dispatch pipeline_completed notification: {notif_err}")

        # Set job stage status to queued for embedding, then dispatch background task
        with UnitOfWork() as uow:
            job = uow.jobs.get(job_id)
            if job:
                job.current_stage = "embedding_generation"
                job.status = "embedding_pending"
            uow.commit()

        EmbeddingWorker.start_embedding_task(video_id, job_id, correlation_id)