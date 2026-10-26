import axios from "axios";

// Default to port 8001 (or 8000 if cached/configured)
const getInitialBaseUrl = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("videosense_backend_url");
    if (saved) return saved;
  }
  return import.meta.env.VITE_API_URL || "http://localhost:8001";
};

export let API_BASE_URL = getInitialBaseUrl();
export let API_V1 = `${API_BASE_URL}/api/v1`;

const client = axios.create({
  baseURL: API_V1,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// Automatic Port Failover Interceptor:
// If connection to port 8001 or 8000 fails, test the alternate port and switch seamlessly
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only attempt retry on connection error without HTTP response
    if (!error.response && error.config && !error.config._portRetried) {
      error.config._portRetried = true;
      const currentPort = API_BASE_URL.includes("8001") ? 8001 : 8000;
      const fallbackPort = currentPort === 8001 ? 8000 : 8001;
      const fallbackBaseUrl = `http://localhost:${fallbackPort}`;

      try {
        const ping = await axios.get(`${fallbackBaseUrl}/api/v1/health/`, { timeout: 2000 });
        if (ping.status === 200) {
          console.info(`[VideoSense API] Switched backend connection to ${fallbackBaseUrl}`);
          API_BASE_URL = fallbackBaseUrl;
          API_V1 = `${fallbackBaseUrl}/api/v1`;
          client.defaults.baseURL = API_V1;
          try {
            localStorage.setItem("videosense_backend_url", fallbackBaseUrl);
          } catch (e) {}

          // Update current failed request and retry
          error.config.baseURL = API_V1;
          return client(error.config);
        }
      } catch (fallbackError) {
        // Both ports unreachable
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // System Health
  getHealth: async () => {
    const res = await client.get("/health/");
    return res.data;
  },

  // List all ingested videos
  getVideos: async () => {
    const res = await client.get("/videos");
    return res.data.data;
  },

  // Single video details
  getVideoDetails: async (videoId) => {
    const res = await client.get(`/videos/${videoId}`);
    return res.data.data;
  },

  // Upload video file & trigger pipeline
  uploadVideo: async (file, title, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    const res = await client.post("/videos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data.data;
  },

  // Poll video processing status & current AI pipeline stage
  getVideoProcessingStatus: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/processing`);
    return res.data.data;
  },

  // Get aggregated multimodal insights (transcripts, objects, OCR, scenes)
  getVideoInsights: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/insights`);
    return res.data.data;
  },

  // Get extracted keyframes with Grounding DINO / YOLO bounding boxes
  getVideoFrames: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/frames`);
    return res.data.data;
  },

  // Direct video stream URL helper
  getVideoStreamUrl: (videoId) => {
    return `${API_V1}/videos/${videoId}/stream`;
  },

  // Video poster / thumbnail URL helper
  getVideoThumbnailUrl: (videoId) => {
    return `${API_V1}/videos/${videoId}/thumbnail`;
  },

  // Timeline segments
  getVideoTimeline: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/timeline`);
    return res.data.data;
  },

  // AI intelligence summary
  getVideoSummary: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/summary`);
    return res.data.data;
  },

  // Preview thumbnail and clip URLs
  getVideoPreview: async (videoId) => {
    const res = await client.get(`/videos/${videoId}/preview`);
    return res.data.data;
  },

  // Multimodal Semantic Search
  searchVideos: async ({ query, videoId = null, modality = null, topK = 5 }) => {
    const payload = {
      query,
      top_k: topK,
    };
    if (videoId) payload.video_id = videoId;
    if (modality && modality !== "ALL") payload.modality = modality;

    const res = await client.post("/search", payload);
    return res.data.data;
  },

  // On-demand custom class detection
  detectCustomClasses: async (videoId, classes, threshold = 0.28) => {
    const res = await client.post(`/videos/${videoId}/detect-custom`, { classes, threshold });
    return res.data;
  },

  // Analytics Hub endpoints
  getAnalyticsOverview: async () => {
    const res = await client.get("/analytics/overview");
    return res.data.data;
  },

  getVideoAnalytics: async (videoId, minConfidence = 0.0) => {
    const res = await client.get(`/analytics/video/${videoId}?min_confidence=${minConfidence}`);
    return res.data.data;
  },

  // Pipeline Jobs Management
  getJobs: async (limit = 50) => {
    const res = await client.get(`/jobs?limit=${limit}`);
    return res.data.data;
  },

  getRecentLogs: async (limit = 100) => {
    const res = await client.get(`/jobs/logs/recent?limit=${limit}`);
    return res.data.data;
  },

  getJobLogs: async (jobId) => {
    const res = await client.get(`/jobs/${jobId}/logs`);
    return res.data.data;
  },

  cancelJob: async (jobId) => {
    const res = await client.post(`/jobs/${jobId}/cancel`);
    return res.data;
  },

  retryJob: async (jobId) => {
    const res = await client.post(`/jobs/${jobId}/retry`);
    return res.data;
  },

  startVideoProcessing: async (videoId) => {
    const res = await client.post(`/videos/${videoId}/process`);
    return res.data;
  },

  saveVideoConfig: async (videoId, config) => {
    const res = await client.post(`/videos/${videoId}/config`, config);
    return res.data;
  },

  getSystemTelemetry: async () => {
    const res = await client.get("/system/telemetry");
    return res.data.data;
  },

  getSystemModels: async () => {
    const res = await client.get("/system/models");
    return res.data.data;
  },

  // Conversational AI & Multimodal Intelligence
  sendChatMessage: async ({ message, videoId = null, persona = "analyst", history = [] }) => {
    const payload = {
      message,
      video_id: videoId || null,
      persona: persona || "analyst",
      history: history || [],
    };
    const res = await client.post("/chat", payload);
    return res.data.data;
  },

  getVideoDossier: async (videoId) => {
    const res = await client.get(`/chat/dossier/${videoId}`);
    return res.data.data;
  },
};

export default api;
