import axios from "axios";

// Resolve API Base URL (supports local dev, Cloudflare Tunnel, and cloud deployments like Render/Vercel)
const getInitialBaseUrl = () => {
  if (typeof window !== "undefined") {
    const isCloudHost = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    const saved = localStorage.getItem("videosense_backend_url");
    if (isCloudHost && saved && (saved.includes("localhost") || saved.includes("127.0.0.1"))) {
      localStorage.removeItem("videosense_backend_url");
    } else if (saved && (!isCloudHost || (!saved.includes("localhost") && !saved.includes("127.0.0.1")))) {
      return saved;
    }

    // When accessed through Cloudflare Tunnel (*.trycloudflare.com), Oracle Cloud IP, or custom domain:
    // ALWAYS route API requests through the current origin so Vite/Nginx proxies /api over HTTPS!
    // This prevents Mixed Content blocks (browser blocking http://localhost from an https:// page).
    if (isCloudHost) {
      if (window.location.hostname.includes("onrender.com")) {
        return "https://videosense-backend-rayw.onrender.com";
      }
      return window.location.origin;
    }
  }

  let url = (import.meta.env.VITE_API_URL || "").trim();
  if (!url) {
    url = "http://localhost:8000";
  }

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
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

// Attach Authorization Bearer token to all outgoing requests
client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("videosense_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Automatic Port Failover Interceptor:
// If connection to local port 8001 or 8000 fails, test the alternate port and switch seamlessly
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only attempt local retry on connection error without HTTP response
    if (!error.response && error.config && !error.config._portRetried && API_BASE_URL.includes("localhost")) {
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
  listVideos: async () => {
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
      timeout: 0, // Disable Axios timeout for video file uploads (prevents timeout of 60000ms exceeded on large files)
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

  // AI Multimodal Video Summarization
  getVideoSummary: async (videoId, mode = null) => {
    const url = mode ? `/videos/${videoId}/summary?mode=${mode}` : `/videos/${videoId}/summary`;
    const res = await client.get(url);
    return res.data.data;
  },

  getSummaryStatus: async (videoId, mode = "audio_visual") => {
    const res = await client.get(`/videos/${videoId}/summary/status?mode=${mode}`);
    return res.data.data;
  },

  summarizeVideo: async (videoId, { mode = "audio_visual", forceRegenerate = false, asyncRun = true } = {}) => {
    const res = await client.post(`/videos/${videoId}/summarize?async_run=${asyncRun}`, {
      mode,
      force_regenerate: forceRegenerate
    });
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

  // Product Discovery & Delivery Logistics Tracking
  getProducts: async ({ category = null, deliveryStatus = null, search = null } = {}) => {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    if (deliveryStatus && deliveryStatus !== "ALL") params.append("delivery_status", deliveryStatus);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await client.get(`/products${qs}`);
    return res.data.data;
  },

  getMatchedProducts: async (videoId) => {
    const res = await client.get(`/products/matched/${videoId}`);
    return res.data.data;
  },

  orderProduct: async (payload) => {
    const res = await client.post("/products/order", payload);
    return res.data.data;
  },

  verifyDelivery: async (payload) => {
    const res = await client.post("/products/verify-delivery", payload);
    return res.data.data;
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

  getUserHistory: async () => {
    const res = await client.get("/analytics/user-history");
    return res.data.data;
  },

  logUserEvent: async ({ event_type, title, details = null, video_id = null }) => {
    const res = await client.post("/analytics/log-event", {
      event_type,
      title,
      details,
      video_id,
    });
    return res.data.data;
  },

  getUserActivityLog: async (eventType = null, limit = 50) => {
    const params = new URLSearchParams();
    if (eventType && eventType !== "ALL") params.append("event_type", eventType);
    params.append("limit", limit);
    const res = await client.get(`/analytics/user-activity-log?${params.toString()}`);
    return res.data.data;
  },

  compareVideos: async (videoAId, videoBId = "fleet_avg") => {
    const res = await client.get(`/analytics/compare?video_a=${videoAId}&video_b=${videoBId}`);
    return res.data.data;
  },

  getKeyframeSpikeDetails: async (videoId, timestamp) => {
    const res = await client.get(`/analytics/video/${videoId}/spike?timestamp=${timestamp}`);
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

  getSystemProcesses: async (limit = 40, filterType = "all") => {
    const res = await client.get(`/system/processes?limit=${limit}&filter_type=${filterType}`);
    return res.data.data;
  },

  getAiModelsStatus: async () => {
    const res = await client.get("/system/models-status");
    return res.data.data;
  },

  getSystemDiagnostics: async () => {
    const res = await client.get("/system/diagnostics");
    return res.data.data;
  },

  purgeSystemCache: async () => {
    const res = await client.post("/system/actions/purge-cache");
    return res.data.data;
  },

  // Activity Logs & Workspace Audit Feed
  getActivityLogs: async ({ category = "all", severity = "ALL", videoId = null, search = "", limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (severity) params.append("severity", severity);
    if (videoId) params.append("video_id", videoId);
    if (search) params.append("search", search);
    params.append("limit", limit);
    params.append("offset", offset);

    const res = await client.get(`/activity/logs?${params.toString()}`);
    return res.data.data;
  },

  getActivityStats: async () => {
    const res = await client.get("/activity/stats");
    return res.data.data;
  },

  exportActivityLogsUrl: (format = "json") => {
    return `${API_V1}/activity/export?export_format=${format}`;
  },

  logActivityEvent: async ({ event_type, title, details = {}, video_id = null }) => {
    const res = await client.post("/analytics/log-event", {
      event_type,
      title,
      details,
      video_id
    });
    return res.data.data;
  },

  clearClientActivityEvents: async () => {
    const res = await client.delete("/activity/clear-client-events");
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

  // Authentication & User Identity Management
  auth: {
    validatePassword: async (password) => {
      const res = await client.post("/auth/validate-password", { password });
      return res.data.data;
    },
    register: async (userData) => {
      const res = await client.post("/auth/register", userData);
      return res.data;
    },
    verifyEmail: async (email, otpCode) => {
      const res = await client.post("/auth/verify-email", { email, otp_code: otpCode });
      return res.data;
    },
    resendEmailOTP: async (email) => {
      const res = await client.post("/auth/resend-email-otp", { email });
      return res.data;
    },
    login: async (identifier, password, rememberMe = false) => {
      const res = await client.post("/auth/login", {
        identifier,
        password,
        remember_me: rememberMe,
      });
      return res.data;
    },
    logout: async () => {
      const res = await client.post("/auth/logout");
      return res.data;
    },
    getMe: async () => {
      const res = await client.get("/auth/me");
      return res.data.data;
    },
    forgotPassword: async (email) => {
      const res = await client.post("/auth/forgot-password", { email });
      return res.data;
    },
    resetPassword: async ({ email, otpCode, newPassword, confirmPassword }) => {
      const res = await client.post("/auth/reset-password", {
        email,
        otp_code: otpCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return res.data;
    },
    changePassword: async (currentPassword, newPassword, confirmPassword) => {
      const res = await client.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return res.data;
    },
    refreshToken: async (refreshToken) => {
      const res = await client.post("/auth/refresh", { refresh_token: refreshToken });
      return res.data.data;
    },
  },

  // Notification Command Center
  getNotifications: async (params = {}) => {
    const res = await client.get("/notifications", { params });
    return res.data.data;
  },
  getNotificationStats: async () => {
    const res = await client.get("/notifications/stats");
    return res.data.data;
  },
  markNotificationRead: async (id) => {
    const res = await client.patch(`/notifications/${id}/read`);
    return res.data;
  },
  markNotificationUnread: async (id) => {
    const res = await client.patch(`/notifications/${id}/unread`);
    return res.data;
  },
  markAllNotificationsRead: async () => {
    const res = await client.patch("/notifications/read-all");
    return res.data;
  },
  resolveNotification: async (id) => {
    const res = await client.patch(`/notifications/${id}/resolve`);
    return res.data;
  },
  deleteNotification: async (id) => {
    const res = await client.delete(`/notifications/${id}`);
    return res.data;
  },
  clearReadNotifications: async () => {
    const res = await client.delete("/notifications/clear-read");
    return res.data;
  },
  getNotificationPreferences: async () => {
    const res = await client.get("/notifications/preferences");
    return res.data.data;
  },
  updateNotificationPreferences: async (prefs) => {
    const res = await client.put("/notifications/preferences", prefs);
    return res.data.data;
  },

  // Activity Center & Audit Trail
  getActivityLogs: async (params = {}) => {
    const res = await client.get("/activity/logs", { params });
    return res.data.data;
  },
  getActivityStats: async () => {
    const res = await client.get("/activity/stats");
    return res.data.data;
  },
  exportActivityLogsUrl: (format = "json") => {
    return `${API_BASE_URL}/activity/export?export_format=${format}`;
  },
  logActivityEvent: async (eventData) => {
    const res = await client.post("/activity/log-event", eventData);
    return res.data;
  },
  clearClientActivityEvents: async () => {
    const res = await client.delete("/activity/clear-client-events");
    return res.data;
  },

  // AI Neural Models & MLOps Engine
  getAIModels: async () => {
    const res = await client.get("/mlops/models");
    return res.data.data;
  },
  getAIModelTelemetry: async () => {
    const res = await client.get("/mlops/telemetry");
    return res.data.data;
  },
  runAIModelBenchmark: async (payload) => {
    const res = await client.post("/mlops/benchmark", payload);
    return res.data.data;
  },
  getAIModelConfig: async () => {
    const res = await client.get("/mlops/config");
    return res.data.data;
  },
  updateAIModelConfig: async (config) => {
    const res = await client.post("/mlops/config", config);
    return res.data.data;
  },
  activateAIModel: async (modelId) => {
    const res = await client.post(`/mlops/activate/${modelId}`);
    return res.data.data;
  },
  initMLOpsDataset: async (payload) => {
    const res = await client.post("/mlops/dataset/init", payload);
    return res.data.data;
  },
  validateMLOpsDataset: async (dataYaml) => {
    const res = await client.post("/mlops/dataset/validate", { data_yaml: dataYaml });
    return res.data.data;
  },
  trainCustomVisionModel: async (payload) => {
    const res = await client.post("/mlops/train", payload);
    return res.data.data;
  },
  getTrainingJobStatus: async (taskId) => {
    const res = await client.get(`/mlops/train/status/${taskId}`);
    return res.data.data;
  },
};

export default api;
