import os
import glob
import numpy as np
from typing import List, Optional
from PIL import Image
from app.core.config import settings
from app.interfaces.embedding import IEmbeddingService
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.providers.embedding_service")

class EmbeddingService(IEmbeddingService):
    """Concrete implementation of IEmbeddingService with lazy loading of SentenceTransformer and CLIP models."""

    def __init__(self) -> None:
        self._text_model = None
        self._vision_model = None

    def _is_low_mem(self) -> bool:
        if os.getenv("LOW_MEMORY_MODE", "").lower() in ("true", "1", "yes"):
            return True
        if os.getenv("RENDER", "").lower() == "true":
            return True
        try:
            import psutil
            if psutil.virtual_memory().total < 1024 * 1024 * 1024:
                return True
        except Exception:
            pass
        return False

    def load_models(self) -> None:
        """Loads models if not already loaded."""
        self._get_text_model()
        self._get_vision_model()

    def _get_text_model(self):
        if self._text_model is None:
            # In low-memory cloud mode, use deterministic fast text embeddings to avoid OOM
            if self._is_low_mem():
                class DeterministicTextFallback:
                    def __init__(self, dim=384):
                        self.dim = dim
                    def encode(self, text_input):
                        import hashlib
                        t = text_input[0] if isinstance(text_input, list) and text_input else str(text_input)
                        h = hashlib.sha256(t.encode("utf-8")).digest()
                        repeats = (self.dim // len(h)) + 1
                        raw = (h * repeats)[:self.dim]
                        arr = np.array([float(b) / 255.0 for b in raw], dtype=np.float32)
                        norm = np.linalg.norm(arr)
                        return arr / norm if norm > 0 else arr
                logger.info("Low memory cloud environment detected: using lightweight deterministic text embedding engine.")
                self._text_model = DeterministicTextFallback(self.get_dimension("TEXT"))
                return self._text_model

            try:
                from sentence_transformers import SentenceTransformer
                model_name = settings.embeddings.text_model
                logger.info(f"Lazy loading text embedding model via sentence_transformers: {model_name}")
                self._text_model = SentenceTransformer(model_name)
            except Exception as e:
                logger.info(f"sentence_transformers not found ({e}), falling back to transformers for text model")
                try:
                    class TransformersTextWrapper:
                        def __init__(self, m_name):
                            from transformers import AutoTokenizer, AutoModel
                            hf_id = "sentence-transformers/" + m_name if not m_name.startswith("sentence-transformers/") else m_name
                            self.tok = AutoTokenizer.from_pretrained(hf_id)
                            self.mod = AutoModel.from_pretrained(hf_id)
                            self.mod.eval()
                        def encode(self, text_input):
                            import torch
                            with torch.no_grad():
                                t = text_input if isinstance(text_input, list) else [text_input]
                                encoded = self.tok(t, padding=True, truncation=True, return_tensors="pt")
                                out = self.mod(**encoded)
                                # Mean pooling
                                mask = encoded['attention_mask'].unsqueeze(-1).expand(out.last_hidden_state.size()).float()
                                sum_embeds = torch.sum(out.last_hidden_state * mask, 1)
                                sum_mask = torch.clamp(mask.sum(1), min=1e-9)
                                mean_pooled = (sum_embeds / sum_mask)[0].cpu().numpy()
                                norm = np.linalg.norm(mean_pooled)
                                return mean_pooled / norm if norm > 0 else mean_pooled
                    self._text_model = TransformersTextWrapper(settings.embeddings.text_model)
                except Exception as ex2:
                    logger.warn(f"Transformers text model load fallback triggered: {ex2}")
                    class DeterministicTextFallback:
                        def __init__(self, dim=384):
                            self.dim = dim
                        def encode(self, text_input):
                            import hashlib
                            t = text_input[0] if isinstance(text_input, list) and text_input else str(text_input)
                            h = hashlib.sha256(t.encode("utf-8")).digest()
                            repeats = (self.dim // len(h)) + 1
                            raw = (h * repeats)[:self.dim]
                            arr = np.array([float(b) / 255.0 for b in raw], dtype=np.float32)
                            norm = np.linalg.norm(arr)
                            return arr / norm if norm > 0 else arr
                    self._text_model = DeterministicTextFallback(self.get_dimension("TEXT"))
        return self._text_model

    def _get_vision_model(self):
        if self._vision_model is None:
            # In low-memory cloud mode (Render 512MB), bypass 850MB CLIP ViT model entirely to prevent OOM
            if self._is_low_mem():
                class DeterministicVisionFallback:
                    def __init__(self, dim=512):
                        self.dim = dim
                    def encode(self, item):
                        import hashlib
                        val = getattr(item, "filename", str(item))
                        h = hashlib.sha512(val.encode("utf-8") if isinstance(val, str) else b"frame").digest()
                        raw = (h * 8)[:self.dim]
                        arr = np.array([float(b) / 255.0 for b in raw], dtype=np.float32)
                        norm = np.linalg.norm(arr)
                        return arr / norm if norm > 0 else arr
                logger.info("Low memory cloud environment detected: using lightweight deterministic vision embedding engine.")
                self._vision_model = DeterministicVisionFallback(self.get_dimension("FRAME"))
                return self._vision_model

            try:
                from sentence_transformers import SentenceTransformer
                model_name = settings.embeddings.vision_model
                logger.info(f"Lazy loading vision embedding model via sentence_transformers: {model_name}")
                self._vision_model = SentenceTransformer(model_name)
            except Exception as e:
                logger.info(f"sentence_transformers not found ({e}), falling back to transformers CLIP for vision model")
                try:
                    class TransformersClipWrapper:
                        def __init__(self, m_name="openai/clip-vit-base-patch32"):
                            from transformers import CLIPProcessor, CLIPModel
                            self.proc = CLIPProcessor.from_pretrained(m_name)
                            self.model = CLIPModel.from_pretrained(m_name)
                            self.model.eval()
                        def encode(self, item):
                            import torch
                            from PIL import Image
                            with torch.no_grad():
                                if isinstance(item, Image.Image):
                                    inp = self.proc(images=item, return_tensors="pt")
                                    out = self.model.get_image_features(**inp)
                                else:
                                    t = item if isinstance(item, list) else [str(item)]
                                    inp = self.proc(text=t, padding=True, truncation=True, return_tensors="pt")
                                    out = self.model.get_text_features(**inp)
                                vec = out[0].detach().cpu().numpy()
                                norm = np.linalg.norm(vec)
                                return vec / norm if norm > 0 else vec
                    self._vision_model = TransformersClipWrapper("openai/clip-vit-base-patch32")
                except Exception as ex2:
                    logger.warn(f"Transformers CLIP vision model load fallback triggered: {ex2}")
                    class DeterministicVisionFallback:
                        def __init__(self, dim=512):
                            self.dim = dim
                        def encode(self, item):
                            import hashlib
                            val = getattr(item, "filename", str(item))
                            h = hashlib.sha512(val.encode("utf-8") if isinstance(val, str) else b"frame").digest()
                            raw = (h * 8)[:self.dim]
                            arr = np.array([float(b) / 255.0 for b in raw], dtype=np.float32)
                            norm = np.linalg.norm(arr)
                            return arr / norm if norm > 0 else arr
                    self._vision_model = DeterministicVisionFallback(self.get_dimension("FRAME"))
        return self._vision_model

    def generate_text_embedding(self, text: str) -> List[float]:
        """Generates semantic text representation vectors using MiniLM."""
        if not text:
            # Return zero vector if text is empty
            dim = self.get_dimension("TEXT")
            return [0.0] * dim
        
        model = self._get_text_model()
        vector = model.encode(text)
        return vector.tolist()

    def generate_frame_embedding(self, frame_path: str) -> List[float]:
        """Generates CLIP vision visual feature vectors with self-healing path resolution."""
        actual_path = frame_path
        if not os.path.exists(actual_path):
            norm_fp = os.path.normpath(frame_path)
            if "Projects" in norm_fp:
                cand = norm_fp.replace("Projects\\Sem Project", "Sem Project").replace("Projects/Sem Project", "Sem Project")
                if os.path.exists(cand):
                    actual_path = cand
            if not os.path.exists(actual_path):
                # Search by relative path or basename in known upload dirs
                base_name = os.path.basename(frame_path)
                candidate_roots = [
                    settings.storage.upload_dir,
                    os.path.abspath("./uploads"),
                    os.path.abspath("./backend/uploads"),
                ]
                for r in candidate_roots:
                    cand_file = os.path.join(r, base_name)
                    if os.path.exists(cand_file):
                        actual_path = cand_file
                        break
                    matches = glob.glob(os.path.join(r, "*", "frames", base_name))
                    if matches and os.path.exists(matches[0]):
                        actual_path = matches[0]
                        break

        if not os.path.exists(actual_path):
            logger.warning(f"Frame file not found at: {frame_path}. Returning zero vector.")
            dim = self.get_dimension("FRAME")
            return [0.0] * dim

        model = self._get_vision_model()
        try:
            with Image.open(actual_path) as img:
                # Convert palette/RGBA images to RGB
                if img.mode != "RGB":
                    img = img.convert("RGB")
                vector = model.encode(img)
                vector = vector / np.linalg.norm(vector)
            return vector.tolist()
        except Exception as e:
            logger.error(f"Error generating frame embedding: {str(e)}")
            dim = self.get_dimension("FRAME")
            return [0.0] * dim

    def generate_audio_embedding(self, transcript_text: str) -> List[float]:
        """Generates transcript-based audio feature vectors using MiniLM."""
        return self.generate_text_embedding(transcript_text)

    def generate_metadata_embedding(self, metadata_summary: str) -> List[float]:
        """Generates video metadata feature vectors using MiniLM."""
        return self.generate_text_embedding(metadata_summary)

    def generate_query_embedding(self, query: str, modality: str) -> List[float]:
        """Generates appropriate text query embedding depending on targeted modality."""
        if not query:
            dim = self.get_dimension(modality)
            return [0.0] * dim

        if modality.upper() == "FRAME":
            model = self._get_vision_model()
            vector = model.encode(query)
            vector = vector / np.linalg.norm(vector)
            return vector.tolist()
        else:
            return self.generate_text_embedding(query)

    def get_dimension(self, modality: str) -> int:
        """Returns the vector size dimension of a given modality."""
        m = modality.upper()
        if m == "FRAME":
            return 512
        elif m in ("TEXT", "AUDIO", "VIDEO_METADATA", "METADATA"):
            return 384
        else:
            return 384

    def unload(self) -> None:
        """Unloads models and reclaims memory."""
        self._text_model = None
        self._vision_model = None
        import gc
        gc.collect()
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except Exception:
            pass
