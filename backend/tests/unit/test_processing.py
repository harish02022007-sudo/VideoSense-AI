import pytest
import os
import time
from typing import List, Dict, Any
from fastapi.testclient import TestClient
from app.main import app
from app.db.unit_of_work import UnitOfWork
from app.core.container import Container
from app.types.results import Result
from app.interfaces.metadata import IMetadataService
from app.interfaces.extraction import IFrameExtractor, IAudioExtractor, IPreviewGenerator
from app.interfaces.scene import ISceneDetector
from app.interfaces.ocr import IOCRService
from app.interfaces.speech import ISpeechRecognizer
from app.interfaces.vision import IObjectDetector

# Define mock extraction providers for testing
class MockMetadataService(IMetadataService):
    def extract_metadata(self, video_path: str) -> Result[Dict[str, Any]]:
        return Result.Success({
            "duration": 10.0,
            "fps": 30,
            "width": 1920,
            "height": 1080,
            "codec": "h264",
            "size_bytes": 1024,
            "bitrate": 128000
        })

class MockFrameExtractor(IFrameExtractor):
    def extract_frames(self, video_path: str, output_dir: str, interval_sec: float, *args, **kwargs) -> Result[List[str]]:
        os.makedirs(output_dir, exist_ok=True)
        # Write dummy files to allow list_artifacts scan checks to pass
        f1 = os.path.join(output_dir, "frame_00001.jpg")
        f2 = os.path.join(output_dir, "frame_00002.jpg")
        with open(f1, "w") as f:
            f.write("")
        with open(f2, "w") as f:
            f.write("")
        return Result.Success([f1, f2])


class MockAudioExtractor(IAudioExtractor):
    def extract_audio(self, video_path: str, output_wav_path: str) -> Result[str]:
        os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
        with open(output_wav_path, "w") as f:
            f.write("")
        return Result.Success(output_wav_path)

class MockPreviewGenerator(IPreviewGenerator):
    def generate_preview(self, video_id: str, video_path: str) -> Result[Dict[str, Any]]:
        # Set paths inside uploads
        from app.core.config import settings
        thumbnails_dir = os.path.join(settings.storage.upload_dir, video_id, "thumbnails")
        analysis_dir = os.path.join(settings.storage.upload_dir, video_id, "analysis")
        os.makedirs(thumbnails_dir, exist_ok=True)
        os.makedirs(analysis_dir, exist_ok=True)
        
        t_path = os.path.join(thumbnails_dir, "thumbnail.jpg")
        p_path = os.path.join(analysis_dir, "preview.mp4")
        with open(t_path, "w") as f:
            f.write("")
        with open(p_path, "w") as f:
            f.write("")
            
        return Result.Success({
            "thumbnail": f"/uploads/{video_id}/thumbnails/thumbnail.jpg",
            "preview_video": f"/uploads/{video_id}/analysis/preview.mp4",
            "duration": 5.0
        })

class MockSceneDetector(ISceneDetector):
    def detect_scenes(self, video_path: str) -> Result[List[Dict[str, Any]]]:
        return Result.Success([
            {"scene_number": 1, "start_time_ms": 0.0, "end_time_ms": 5000.0},
            {"scene_number": 2, "start_time_ms": 5000.0, "end_time_ms": 10000.0}
        ])

class MockOCRService(IOCRService):
    def extract_text(self, frame_paths: List[str]) -> Result[List[Any]]:
        return Result.Success([
            {
                "frame_path": frame_paths[0],
                "text": "Simulated OCR Screen Text",
                "confidence": 0.95,
                "box_x_min": 10.0,
                "box_y_min": 20.0,
                "box_x_max": 100.0,
                "box_y_max": 50.0,
                "language": "en",
                "frame_timestamp": 0.0
            }
        ])

class MockSpeechRecognizer(ISpeechRecognizer):
    def transcribe(self, audio_path: str) -> Result[List[Dict[str, Any]]]:
        return Result.Success([
            {
                "text": "Simulated dialogue script line",
                "confidence": 0.96,
                "start_time_ms": 0.0,
                "end_time_ms": 3000.0,
                "speaker_label": "speaker_1",
                "language": "en"
            }
        ])

class MockObjectDetector(IObjectDetector):
    def detect_objects(self, frame_paths: List[str], *args, **kwargs) -> Result[List[Any]]:
        return Result.Success([
            {
                "frame_path": frame_paths[0],
                "class_label": "person",
                "confidence": 0.89,
                "box_x_min": 100.0,
                "box_y_min": 150.0,
                "box_x_max": 200.0,
                "box_y_max": 500.0,
                "tracking_id": "1",
                "first_seen_timestamp": 0.0,
                "last_seen_timestamp": 1.0
            }
        ])


def test_complete_processing_flow():
    """Verify that uploading a valid MP4 file and triggering processing executes all stages successfully."""
    # 1. Apply Mock DI overrides
    orig_meta = Container._metadata_service
    orig_frames = Container._frame_extractor
    orig_audio = Container._audio_extractor
    orig_preview = Container._preview_generator
    orig_scene = Container._scene_detector
    orig_ocr = Container._ocr_service
    orig_speech = Container._speech_service
    orig_vision = Container._vision_service

    Container._metadata_service = MockMetadataService()
    Container._frame_extractor = MockFrameExtractor()
    Container._audio_extractor = MockAudioExtractor()
    Container._preview_generator = MockPreviewGenerator()
    Container._scene_detector = MockSceneDetector()
    Container._ocr_service = MockOCRService()
    Container._speech_service = MockSpeechRecognizer()
    Container._vision_service = MockObjectDetector()

    try:
        # 2. Run TestClient using the startup lifespan context manager
        with TestClient(app, raise_server_exceptions=False) as client:
            # 3. Ingest Video
            file_content = b"fake video content stream data"
            files = {"file": ("test_integration.mp4", file_content, "video/mp4")}
            
            response = client.post("/api/v1/videos/upload", files=files, data={"title": "Integration Test Video"})
            assert response.status_code == 200
            json_data = response.json()
            assert json_data["success"] is True
            
            video_id = json_data["data"]["video_id"]
            job_id = json_data["data"]["job_id"]

            # 4. Configure video processing options
            config_payload = {
                "enable_ocr": True,
                "enable_audio": True,
                "enable_objects": True,
                "enable_scene_detection": True,
                "frame_rate": 2.0,
                "whisper_model": "tiny",
                "yolo_model": "yolo11m.pt"
            }
            config_res = client.post(f"/api/v1/videos/{video_id}/configure", json=config_payload)
            assert config_res.status_code == 200
            assert config_res.json()["success"] is True

            # 5. Trigger async processing pipeline run
            process_res = client.post(f"/api/v1/videos/{video_id}/process")
            assert process_res.status_code == 200
            assert process_res.json()["success"] is True

            # Wait for the background worker loop to process the queue items
            status_data = {}
            for _ in range(15):
                status_res = client.get(f"/api/v1/videos/{video_id}/processing")
                assert status_res.status_code == 200
                status_data = status_res.json()["data"]
                if status_data.get("status") in ("completed", "failed"):
                    break
                time.sleep(0.5)

            assert status_data["status"] == "completed"
            assert status_data["progress"] == 100

            # 7. Verify Database Records via repositories layers inside UOW context
            with UnitOfWork() as uow:
                # Check frames count
                frames = uow.frames.get_by_video_id(video_id)
                assert len(frames) > 0
                
                # Check ocr hits count
                ocr = uow.ocr_results.get_by_video_id(video_id)
                assert len(ocr) > 0
                
                # Check scenes cuts count
                scenes = uow.scenes.get_by_video_id(video_id)
                assert len(scenes) > 0

                # Check transcripts lines count
                transcripts = uow.transcripts.get_by_video_id(video_id)
                assert len(transcripts) > 0

                # Check objects boxes count
                objects = uow.objects.get_by_video_id(video_id)
                assert len(objects) > 0

                # Check audio strip details
                audio = uow.audio.get_by_video_id(video_id)
                assert audio is not None

            # 8. Verify GET Query endpoints
            artifacts_res = client.get(f"/api/v1/videos/{video_id}/artifacts")
            assert artifacts_res.status_code == 200
            assert len(artifacts_res.json()["data"]["frames"]) > 0

            analytics_res = client.get(f"/api/v1/videos/{video_id}/analytics")
            assert analytics_res.status_code == 200
            assert analytics_res.json()["data"]["detected_objects_count"] > 0

            summary_res = client.get(f"/api/v1/videos/{video_id}/summary")
            assert summary_res.status_code == 200
            assert summary_res.json()["data"]["video_id"] == video_id

            timeline_res = client.get(f"/api/v1/videos/{video_id}/timeline")
            assert timeline_res.status_code == 200
            assert len(timeline_res.json()["data"]) > 0

    finally:
        # 9. Restore original container mapping states
        Container._metadata_service = orig_meta
        Container._frame_extractor = orig_frames
        Container._audio_extractor = orig_audio
        Container._preview_generator = orig_preview
        Container._scene_detector = orig_scene
        Container._ocr_service = orig_ocr
        Container._speech_service = orig_speech
        Container._vision_service = orig_vision
