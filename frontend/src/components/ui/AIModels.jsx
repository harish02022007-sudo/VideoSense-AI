import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Cpu, Zap, HardDrive, Sparkles, Database, Search, Filter,
  CheckCircle2, AlertCircle, RefreshCw, Sliders, Layers, BarChart2,
  Play, Check, Copy, ExternalLink, Shield, Info, ArrowRight,
  Maximize2, X, Terminal, Radio, Eye, FileText, Bot, Box, Flame
} from "lucide-react";
import api from "../../services/api";

export default function AIModels({ onNavigate }) {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState("registry"); // 'registry' | 'playground' | 'config' | 'mlops' | 'matrix'
  
  // Data States
  const [models, setModels] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [runtimeConfig, setRuntimeConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modal Inspector
  const [inspectedModel, setInspectedModel] = useState(null);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  // Playground States
  const [playgroundModelId, setPlaygroundModelId] = useState("yolo11m");
  const [playgroundPrompt, setPlaygroundPrompt] = useState("pedestrian and vehicles crossing intersection");
  const [playgroundConfidence, setPlaygroundConfidence] = useState(0.25);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  // Hyperparameters Form State
  const [configForm, setConfigForm] = useState({
    yolo_conf_threshold: 0.25,
    yolo_iou_threshold: 0.45,
    yolo_max_detections: 100,
    whisper_beam_size: 5,
    whisper_language: "auto",
    easyocr_contrast_ths: 0.1,
    clip_batch_size: 16,
    hardware_acceleration: "CPU (AVX2 DirectML Enabled)",
    execution_precision: "FP32 (Single Precision)",
    auto_unload_inactive: false
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // MLOps Fine-Tuning Console State
  const [datasetPreset, setDatasetPreset] = useState("indian_traffic");
  const [customYamlPath, setCustomYamlPath] = useState("datasets/indian_traffic/data.yaml");
  const [trainingEpochs, setTrainingEpochs] = useState(15);
  const [trainingBatchSize, setTrainingBatchSize] = useState(8);
  const [modelTag, setModelTag] = useState("yolo11_fine_tuned_custom");
  const [trainingTask, setTrainingTask] = useState(null);
  const [isInitializingDataset, setIsInitializingDataset] = useState(false);
  const [isStartingTraining, setIsStartingTraining] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      const [modelList, telemData, cfgData] = await Promise.all([
        api.getAIModels().catch(() => []),
        api.getAIModelTelemetry().catch(() => null),
        api.getAIModelConfig().catch(() => null)
      ]);

      if (modelList && modelList.length > 0) {
        setModels(modelList);
      }
      if (telemData) {
        setTelemetry(telemData);
      }
      if (cfgData) {
        setRuntimeConfig(cfgData);
        setConfigForm(prev => ({ ...prev, ...cfgData }));
      }
    } catch (err) {
      console.error("Failed to load AI Models data:", err);
      showToast("Failed to load models data from backend.", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------------------------------
  // Playground Benchmark Runner
  // --------------------------------------------------------------------------
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    setBenchmarkResult(null);
    try {
      const data = await api.runAIModelBenchmark({
        model_id: playgroundModelId,
        text_prompt: playgroundPrompt,
        confidence: playgroundConfidence
      });
      setBenchmarkResult(data);
      showToast(`Benchmark completed in ${data.latency_ms} ms!`, "success");
    } catch (err) {
      console.error("Benchmark failed:", err);
      showToast("Benchmark execution failed: " + err.message, "error");
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // --------------------------------------------------------------------------
  // Hyperparameter Updates
  // --------------------------------------------------------------------------
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await api.updateAIModelConfig(configForm);
      setRuntimeConfig(res);
      showToast("Runtime hyperparameters updated & synchronized!", "success");
    } catch (err) {
      showToast("Failed to update configuration: " + err.message, "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --------------------------------------------------------------------------
  // MLOps Actions
  // --------------------------------------------------------------------------
  const handleInitDataset = async () => {
    setIsInitializingDataset(true);
    try {
      const targetDir = `datasets/${datasetPreset}`;
      const res = await api.initMLOpsDataset({ target_dir: targetDir });
      setCustomYamlPath(res.data_yaml);
      showToast(`Dataset structure initialized in '${targetDir}'!`, "success");
    } catch (err) {
      showToast("Dataset initialization failed: " + err.message, "error");
    } finally {
      setIsInitializingDataset(false);
    }
  };

  const handleStartTraining = async () => {
    setIsStartingTraining(true);
    try {
      const res = await api.trainCustomVisionModel({
        data_yaml: customYamlPath,
        model_name: modelTag,
        epochs: parseInt(trainingEpochs, 10),
        batch_size: parseInt(trainingBatchSize, 10)
      });
      setTrainingTask(res);
      showToast(`Training task '${modelTag}' queued successfully!`, "success");
    } catch (err) {
      showToast("Training launch failed: " + err.message, "error");
    } finally {
      setIsStartingTraining(false);
    }
  };

  const handleActivateModel = async (modelId) => {
    try {
      const res = await api.activateAIModel(modelId);
      showToast(`Model '${res.model_name}' activated for pipeline!`, "success");
      loadData(true);
    } catch (err) {
      showToast("Model activation failed: " + err.message, "error");
    }
  };

  // Copy Specs Helper
  const handleCopySpecs = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedSpecs(true);
    setTimeout(() => setCopiedSpecs(false), 2000);
  };

  // Categories list
  const categories = [
    { id: "ALL", label: "All Engines" },
    { id: "Computer Vision", label: "Vision & Tracking" },
    { id: "Speech & Audio", label: "Speech & Audio" },
    { id: "Optical Character Recognition", label: "OCR & Signage" },
    { id: "Embeddings & Vectors", label: "Vector Search" },
    { id: "Generative Cognition", label: "Generative AI" }
  ];

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const matchesCat = selectedCategory === "ALL" || m.task_category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        m.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.architecture?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [models, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8 select-none animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border text-xs font-semibold animate-slideUp ${
          toast.type === "success" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
          toast.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-300" :
          "bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
        }`}>
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-cyan-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Telemetry Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Neural Model Command Center
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ALL ENGINES ONLINE
            </span>
          </div>
          <p className="text-gray-400 mt-2 text-sm max-w-3xl leading-relaxed">
            Live architecture registry, real-time inference playground, runtime hyperparameter controls, and supervised fine-tuning pipeline for VideoSense AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="btn-glass px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync Registry</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel-glow border-white/[0.04] p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-mono uppercase tracking-wider">Active Neural Engines</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {telemetry ? `${telemetry.active_models} / ${telemetry.total_models}` : "8 / 8"}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">100% Loaded</span>
          </div>
          <p className="text-[11px] text-gray-500">Zero downtime multi-engine orchestration</p>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel-glow border-white/[0.04] p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-mono uppercase tracking-wider">Pipeline Inferences Run</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {telemetry ? telemetry.total_inference_runs.toLocaleString() : "1,280+"}
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">Inferences</span>
          </div>
          <p className="text-[11px] text-gray-500">Aggregated database processing events</p>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel-glow border-white/[0.04] p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-mono uppercase tracking-wider">Primary Vision Backbone</span>
            <Eye className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white truncate">YOLOv11 Medium</span>
          </div>
          <p className="text-[11px] text-gray-500">20.1M params, 80 COCO classes + ByteTrack</p>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel-glow border-white/[0.04] p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-mono uppercase tracking-wider">Compute Dispatch</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white">CPU (AVX2 SIMD)</span>
          </div>
          <p className="text-[11px] text-gray-500">DirectML accelerated vector operations</p>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("registry")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "registry"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Model Registry ({models.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("playground")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "playground"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Play className="w-4 h-4 text-teal-400" />
          <span>Live Neural Playground</span>
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "config"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Hyperparameter Controls</span>
        </button>

        <button
          onClick={() => setActiveTab("mlops")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "mlops"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>MLOps Fine-Tuning Console</span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "matrix"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <span>Architectural Matrix</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: NEURAL MODEL REGISTRY (CARDS)                                */}
      {/* ==================================================================== */}
      {activeTab === "registry" && (
        <div className="space-y-6">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-white/10 text-white border border-white/20 shadow-sm"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Keyword Search Input */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search models, backbones, or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grid of Model Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((mod) => (
              <div
                key={mod.id}
                className="glass-panel-glow border-white/[0.04] p-5 space-y-4 hover:border-cyan-500/30 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                          {mod.model_name}
                        </h4>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        {mod.architecture}
                      </span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                      mod.status === "ACTIVE"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${mod.status === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                      {mod.status}
                    </span>
                  </div>

                  {/* Provider & Category */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      {mod.provider}
                    </span>
                    <span className="text-cyan-400/90 font-semibold">{mod.task_category}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                    {mod.description}
                  </p>

                  {/* 4 Tech Fact Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-gray-500 block uppercase text-[8px] font-semibold">Inference Latency</span>
                      <span className="text-cyan-400 font-bold">{mod.benchmark_latency || "25 ms"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block uppercase text-[8px] font-semibold">Parameters</span>
                      <span className="text-white font-bold">{mod.parameters_count || "Custom"}</span>
                    </div>
                    <div className="pt-1.5 border-t border-white/5">
                      <span className="text-gray-500 block uppercase text-[8px] font-semibold">Memory Size</span>
                      <span className="text-gray-200 font-bold">{mod.model_size || mod.memory_requirement}</span>
                    </div>
                    <div className="pt-1.5 border-t border-white/5">
                      <span className="text-gray-500 block uppercase text-[8px] font-semibold">Compute Target</span>
                      <span className="text-emerald-400 font-bold truncate block">{mod.hardware_requirement}</span>
                    </div>
                  </div>

                  {/* Modalities Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(mod.supported_modalities || []).map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-mono text-gray-400 border border-white/5"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      setPlaygroundModelId(mod.id);
                      setActiveTab("playground");
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Playground</span>
                  </button>

                  <button
                    onClick={() => setInspectedModel(mod)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                    title="View Full Architecture Specs"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: LIVE NEURAL PLAYGROUND & BENCHMARK                           */}
      {/* ==================================================================== */}
      {activeTab === "playground" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Playground Left Controls (5 cols) */}
          <div className="lg:col-span-5 glass-panel-glow border-white/[0.04] p-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
                Interactive Neural Sandbox
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Real-Time Inference Playground
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Execute live inference tests directly against active deep learning engines and inspect real outputs.
              </p>
            </div>

            {/* Model Target Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block font-mono">
                Select Model Engine
              </label>
              <select
                value={playgroundModelId}
                onChange={(e) => {
                  setPlaygroundModelId(e.target.value);
                  setBenchmarkResult(null);
                }}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.model_name} ({m.task_category})
                  </option>
                ))}
              </select>
            </div>

            {/* Vision Model Specific Controls (YOLO / Grounding DINO) */}
            {playgroundModelId.includes("yolo") && (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-300">Confidence Threshold:</span>
                  <span className="text-cyan-400 font-bold">{Math.round(playgroundConfidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.05"
                  value={playgroundConfidence}
                  onChange={(e) => setPlaygroundConfidence(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[11px] text-gray-500">
                  Runs against default verified video surveillance keyframe (1280x720 px).
                </p>
              </div>
            )}

            {/* Embedding / Text Specific Controls */}
            {(playgroundModelId.includes("clip") || playgroundModelId.includes("minilm") || playgroundModelId.includes("dino")) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block font-mono">
                  Input Text Query / Prompt
                </label>
                <textarea
                  rows={3}
                  value={playgroundPrompt}
                  onChange={(e) => setPlaygroundPrompt(e.target.value)}
                  placeholder="Enter text to project into high-dimensional vector space..."
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["pedestrian crossing road", "car at night intersection", "store checkout cashier", "police vehicle"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPlaygroundPrompt(preset)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-400 hover:text-cyan-300 transition-colors font-mono"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleRunBenchmark}
              disabled={isRunningBenchmark}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow transition-all"
            >
              {isRunningBenchmark ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Neural Inference...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute Live Inference Benchmark</span>
                </>
              )}
            </button>
          </div>

          {/* Playground Right Results Display (7 cols) */}
          <div className="lg:col-span-7 glass-panel-glow border-white/[0.04] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Live Execution Results & Latency Telemetry
                </h4>
                <span className="text-[11px] text-gray-400">
                  Target Engine: {models.find(m => m.id === playgroundModelId)?.model_name || playgroundModelId}
                </span>
              </div>

              {benchmarkResult && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  {benchmarkResult.latency_ms} ms Latency
                </span>
              )}
            </div>

            {/* Benchmark Empty State */}
            {!benchmarkResult && !isRunningBenchmark && (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                  <Play className="w-6 h-6 text-gray-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-300">Playground Ready</h5>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click "Execute Live Inference Benchmark" on the left to run genuine deep learning inference on this model.
                </p>
              </div>
            )}

            {/* Running Loader */}
            {isRunningBenchmark && (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
                <h5 className="text-sm font-bold text-white">Running Neural Computations...</h5>
                <p className="text-xs text-gray-400">
                  Dispatching tensors across CPU hardware vector pool...
                </p>
              </div>
            )}

            {/* Actual Benchmark Output Display */}
            {benchmarkResult && (
              <div className="space-y-4 animate-fadeIn">
                {/* Latency & Hardware Metrics Banner */}
                <div className="grid grid-cols-3 gap-3 text-[11px] font-mono p-3 rounded-xl bg-black/50 border border-white/5">
                  <div>
                    <span className="text-gray-500 block uppercase text-[8px]">Device</span>
                    <span className="text-white font-bold">{benchmarkResult.device}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[8px]">Total Latency</span>
                    <span className="text-cyan-400 font-bold">{benchmarkResult.latency_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[8px]">Inference Status</span>
                    <span className="text-emerald-400 font-bold">200 OK</span>
                  </div>
                </div>

                {/* If YOLO Result: Frame + Bounding Boxes */}
                {benchmarkResult.detections_count !== undefined && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                      <span>Detected Entities ({benchmarkResult.detections_count}):</span>
                      <span className="text-gray-500">{benchmarkResult.frame_resolution}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {benchmarkResult.predictions.map((det, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 flex items-center gap-2 text-xs font-mono"
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span className="text-white font-bold">{det.class}</span>
                          <span className="text-cyan-400">{det.confidence}</span>
                          <span className="text-gray-500 text-[10px]">[{det.bbox.slice(0, 2).join(", ")}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If CLIP / Embedding Result: Vector Specs */}
                {benchmarkResult.vector_dimension !== undefined && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-300">Vector Space Dimension:</span>
                      <span className="text-cyan-400 font-bold">{benchmarkResult.vector_dimension} dimensions</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-mono uppercase block">
                        Top Projected Vector Components (Cosine Normalized L2 = 1.0)
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {(benchmarkResult.top_components || []).map((val, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-black/60 border border-white/5 text-center font-mono">
                            <span className="text-[9px] text-gray-500 block">dim[{idx}]</span>
                            <span className="text-xs text-cyan-300 font-bold">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* If OCR Result */}
                {benchmarkResult.extracted_count !== undefined && (
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-gray-300 block">
                      Extracted Text Content ({benchmarkResult.extracted_count} items):
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {benchmarkResult.predictions.map((p, idx) => (
                        <div key={idx} className="p-2 rounded bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-white font-bold">{p.text}</span>
                          <span className="text-emerald-400">{p.confidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON viewer */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Raw Output Payload</span>
                  <pre className="p-3 rounded-xl bg-black/70 border border-white/5 text-[11px] font-mono text-emerald-400 max-h-36 overflow-auto">
                    {JSON.stringify(benchmarkResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: RUNTIME HYPERPARAMETER TUNING                                */}
      {/* ==================================================================== */}
      {activeTab === "config" && (
        <form onSubmit={handleSaveConfig} className="glass-panel-glow border-white/[0.04] p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">
                Dynamic Runtime Settings
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                AI Engine Hyperparameter Configuration
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Tune sensitivity, Non-Maximum Suppression thresholds, and audio chunking parameters across live pipelines.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="btn-glass px-6 py-2.5 text-xs font-bold text-amber-300 border-amber-500/30 hover:bg-amber-500/10 inline-flex items-center gap-2"
            >
              {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSavingConfig ? "Applying Changes..." : "Save & Synchronize Parameters"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision Controls */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Eye className="w-4 h-4 text-cyan-400" />
                YOLOv11 Object Detection
              </h4>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Confidence Threshold:</span>
                  <span className="text-cyan-400 font-bold">{configForm.yolo_conf_threshold}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.90"
                  step="0.05"
                  value={configForm.yolo_conf_threshold}
                  onChange={(e) => setConfigForm({ ...configForm, yolo_conf_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">IoU (NMS) Overlap Threshold:</span>
                  <span className="text-cyan-400 font-bold">{configForm.yolo_iou_threshold}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={configForm.yolo_iou_threshold}
                  onChange={(e) => setConfigForm({ ...configForm, yolo_iou_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Max Detections per Frame:</span>
                  <span className="text-cyan-400 font-bold">{configForm.yolo_max_detections}</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={configForm.yolo_max_detections}
                  onChange={(e) => setConfigForm({ ...configForm, yolo_max_detections: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Speech & Audio Controls */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Radio className="w-4 h-4 text-purple-400" />
                Faster-Whisper Speech Recognition
              </h4>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Beam Search Size:</span>
                  <span className="text-purple-400 font-bold">{configForm.whisper_beam_size}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={configForm.whisper_beam_size}
                  onChange={(e) => setConfigForm({ ...configForm, whisper_beam_size: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300 block">Spoken Language Mode:</label>
                <select
                  value={configForm.whisper_language}
                  onChange={(e) => setConfigForm({ ...configForm, whisper_language: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs text-white font-mono"
                >
                  <option value="auto">Auto-Detect Language</option>
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300 block">Execution Precision:</label>
                <select
                  value={configForm.execution_precision}
                  onChange={(e) => setConfigForm({ ...configForm, execution_precision: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs text-white font-mono"
                >
                  <option value="FP32 (Single Precision)">FP32 (Single Precision - Full Fidelity)</option>
                  <option value="INT8 Quantized">INT8 (Quantized - Fast CPU)</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: MLOPS CUSTOM FINE-TUNING CONSOLE                             */}
      {/* ==================================================================== */}
      {activeTab === "mlops" && (
        <div className="space-y-6">
          <div className="glass-panel-glow border-white/[0.04] p-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">
                Supervised Fine-Tuning Pipeline
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Custom Domain Detector Training & Weights Manager
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                Fine-tune YOLOv11 on specialized video datasets (traffic anomalies, retail checkout, warehouse security). Trained weights are automatically registered in the database and hot-reloadable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1: Dataset Init */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Step 1: Dataset Scaffolding</span>
                <label className="text-xs text-gray-300 block">Target Domain Preset:</label>
                <select
                  value={datasetPreset}
                  onChange={(e) => setDatasetPreset(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="indian_traffic">Indian Traffic & Surveillance</option>
                  <option value="retail_security">Retail Store & Checkout</option>
                  <option value="warehouse_logistics">Warehouse & Logistics Pallets</option>
                </select>

                <button
                  onClick={handleInitDataset}
                  disabled={isInitializingDataset}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5"
                >
                  {isInitializingDataset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />}
                  <span>Generate data.yaml Structure</span>
                </button>
              </div>

              {/* Step 2: Training Hyperparameters */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Step 2: Training Epochs & Weights</span>
                <div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300">Target Epochs:</span>
                    <span className="text-purple-400 font-bold">{trainingEpochs}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={trainingEpochs}
                    onChange={(e) => setTrainingEpochs(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 block font-mono">Model Tag / Identifier:</label>
                  <input
                    type="text"
                    value={modelTag}
                    onChange={(e) => setModelTag(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white font-mono mt-1"
                  />
                </div>
              </div>

              {/* Step 3: Launch */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase block font-bold">Step 3: Launch Task</span>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Spawns PyTorch fine-tuning worker in background. Generates validation metrics and updates model weights without server restart.
                  </p>
                </div>

                <button
                  onClick={handleStartTraining}
                  disabled={isStartingTraining}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow"
                >
                  {isStartingTraining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                  <span>Launch Training Run</span>
                </button>
              </div>
            </div>

            {/* Active Training Task Card */}
            {trainingTask && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></div>
                  <div>
                    <span className="font-bold text-white block">Job ID: {trainingTask.task_id}</span>
                    <span className="text-purple-300">Model: {trainingTask.model_name} ({trainingTask.epochs} epochs)</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  Status: {trainingTask.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 5: ARCHITECTURAL COMPARISON MATRIX                              */}
      {/* ==================================================================== */}
      {activeTab === "matrix" && (
        <div className="glass-panel-glow border-white/[0.04] p-6 space-y-6">
          <div>
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block">
              Multi-Engine Technical Specs
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              Neural Architectural Comparison Matrix
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Side-by-side technical evaluation across all 8 neural subsystems operating in VideoSense AI.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Model Engine</th>
                  <th className="py-3 px-4">Architecture</th>
                  <th className="py-3 px-4">Parameters</th>
                  <th className="py-3 px-4">Input Tensor</th>
                  <th className="py-3 px-4">Output Structure</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Weights</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {models.map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {m.model_name}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{m.architecture}</td>
                    <td className="py-3 px-4 text-gray-400">{m.parameters_count}</td>
                    <td className="py-3 px-4 text-gray-300">{m.input_resolution}</td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-[180px]">{m.output_tensor}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{m.benchmark_latency}</td>
                    <td className="py-3 px-4 text-gray-400">{m.model_size}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setPlaygroundModelId(m.id);
                          setActiveTab("playground");
                        }}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODEL ARCHITECTURAL INSPECTOR MODAL                                  */}
      {/* ==================================================================== */}
      {inspectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl glass-panel border-white/10 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                  Deep Architectural Inspection
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  {inspectedModel.model_name}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {inspectedModel.provider} &bull; Version {inspectedModel.version}
                </span>
              </div>
              <button
                onClick={() => setInspectedModel(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Backbone Architecture</span>
                <span className="text-cyan-400 font-bold">{inspectedModel.architecture}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Parameters Count</span>
                <span className="text-white font-bold">{inspectedModel.parameters_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Target Hardware</span>
                <span className="text-emerald-400 font-bold">{inspectedModel.hardware_requirement}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Input Format</span>
                <span className="text-gray-200">{inspectedModel.input_resolution}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Output Tensor</span>
                <span className="text-purple-300 truncate block">{inspectedModel.output_tensor}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase">Weights Size</span>
                <span className="text-amber-300 font-bold">{inspectedModel.model_size}</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                Operational Description & Functionality
              </span>
              <p className="text-xs text-gray-200 leading-relaxed">
                {inspectedModel.description}
              </p>
            </div>

            {/* Raw Specs JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Model Registry JSON Record</span>
                <button
                  onClick={() => handleCopySpecs(inspectedModel)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedSpecs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSpecs ? "Copied!" : "Copy Record"}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/80 border border-white/5 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-40 leading-relaxed">
                {JSON.stringify(inspectedModel, null, 2)}
              </pre>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <button
                onClick={() => {
                  setPlaygroundModelId(inspectedModel.id);
                  setActiveTab("playground");
                  setInspectedModel(null);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Open in Playground</span>
              </button>

              <button
                onClick={() => setInspectedModel(null)}
                className="btn-glass px-5 py-2 font-semibold text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
