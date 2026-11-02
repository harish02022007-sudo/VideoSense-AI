import React, { useState, useEffect, useMemo } from "react";
import { 
  ShoppingBag, Truck, Package, CheckCircle2, Clock, Search, Filter, 
  Play, ExternalLink, ShieldCheck, MapPin, ArrowRight, Video, 
  Sparkles, RefreshCw, Eye, Tag, AlertCircle, Copy, Check, ChevronRight,
  Download, Plus, X, Layers, User, Calendar
} from "lucide-react";
import api, { API_BASE_URL } from "../../services/api";

export default function ProductDeliveryConsole({ selectedVideoId, onSelectVideo, onNavigate }) {
  const [videoList, setVideoList] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState(selectedVideoId || null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null); // For modal inspection
  const [orderModalProduct, setOrderModalProduct] = useState(null); // For dispatch/order
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [copiedTracking, setCopiedTracking] = useState(null);
  const [verifiedPod, setVerifiedPod] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("similarity"); // similarity, price_asc, price_desc, name

  // Active view mode: 'catalog' | 'delivery_manifest' | 'video_matches'
  const [viewTab, setViewTab] = useState("catalog");

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, []);

  // Update activeVideoId if prop changes
  useEffect(() => {
    if (selectedVideoId) {
      setActiveVideoId(selectedVideoId);
    }
  }, [selectedVideoId]);

  // Load products when activeVideoId changes
  useEffect(() => {
    loadProducts();
  }, [activeVideoId]);

  const loadVideos = async () => {
    try {
      const res = await api.getVideos();
      const items = Array.isArray(res) ? res : (res?.items || []);
      const completed = items.filter(v => v.status === "completed" || v.duration);
      setVideoList(completed.length > 0 ? completed : items);
      if (!activeVideoId && items.length > 0) {
        // Prefer gemini video if present
        const pref = items.find(v => v.id === "3a7edc72-5aeb-4855-8394-45e85a77bc07") || items[0];
        setActiveVideoId(pref.id);
      }
    } catch (err) {
      console.error("Error loading videos:", err);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      let data = [];
      if (activeVideoId) {
        data = await api.getMatchedProducts(activeVideoId);
      } else {
        data = await api.getProducts();
      }
      setProducts(data || []);
    } catch (err) {
      console.error("Error loading matched products:", err);
      // Fallback to static catalog
      try {
        const fallback = await api.getProducts();
        setProducts(fallback || []);
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  // Copy tracking number to clipboard
  const handleCopyTracking = (trk) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(trk);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  // Handle proof-of-delivery verification
  const handleVerifyPod = async (prod) => {
    try {
      const res = await api.verifyDelivery({
        video_id: activeVideoId || "general-feed",
        product_id: prod.id,
        timestamp: prod.appearances_in_video?.[0]?.timestamp || 0.0,
        notes: `AI Visual Proof-of-Delivery verified for ${prod.name} (${prod.matched_class}) via camera telemetry.`
      });
      setVerifiedPod(res);
    } catch (err) {
      console.error("Failed to verify delivery:", err);
    }
  };

  // Handle Order Dispatch
  const handleDispatchOrder = async (e) => {
    e.preventDefault();
    if (!orderModalProduct) return;
    const form = e.target;
    const recipient = form.recipient.value;
    const address = form.address.value;
    const carrier = form.carrier.value;

    try {
      const res = await api.orderProduct({
        product_id: orderModalProduct.id,
        quantity: 1,
        recipient_name: recipient,
        delivery_address: address,
        carrier
      });
      setOrderSuccess(res);
      setOrderModalProduct(null);
    } catch (err) {
      console.error("Order error:", err);
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchClass = p.matched_class.toLowerCase().includes(q);
          const matchTrk = p.tracking_number.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchClass && !matchTrk) return false;
        }
        // Category
        if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
          return false;
        }
        // Delivery Status
        if (selectedDeliveryStatus !== "ALL" && p.delivery_status !== selectedDeliveryStatus) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "similarity") return b.similarity_score - a.similarity_score;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedDeliveryStatus, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = products.length;
    const matchedCount = products.filter(p => p.appearances_in_video && p.appearances_in_video.length > 0).length;
    const deliveredCount = products.filter(p => p.delivery_status === "Delivered" || p.delivery_status === "Handover Verified").length;
    const inTransitCount = products.filter(p => p.delivery_status === "In Transit" || p.delivery_status === "Out for Delivery").length;
    return { total, matchedCount, deliveredCount, inTransitCount };
  }, [products]);

  const activeVideo = videoList.find(v => v.id === activeVideoId);

  // Status style helper
  const getDeliveryStatusStyle = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "Handover Verified":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "In Transit":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "Out for Delivery":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      default:
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* 1. Header & Live Video Selection Bar */}
      <div className="glass-panel p-6 border-white/[0.08] bg-black/40 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300">
              <ShoppingBag className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                Visual Product Discovery & Delivery Logistics
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  AI Grounding DINO + FAISS
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Detected objects in video streams cross-referenced against e-commerce vector catalogs with automated Proof-of-Delivery verification.
              </p>
            </div>
          </div>
        </div>

        {/* Video Cross-Reference Picker */}
        <div className="flex items-center gap-3 bg-black/60 p-2 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 pl-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-gray-400">Stream:</span>
          </div>
          <select
            value={activeVideoId || ""}
            onChange={(e) => setActiveVideoId(e.target.value)}
            className="bg-black/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 max-w-[200px] truncate"
          >
            {videoList.map((v) => (
              <option key={v.id} value={v.id}>
                {v.filename || v.id.slice(0, 8)} ({v.duration ? `${Math.round(v.duration)}s` : "stream"})
              </option>
            ))}
          </select>
          <button
            onClick={loadProducts}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Detection Matches"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-white/5 bg-black/40 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Tracked Catalog Items</span>
          <div className="text-xl font-extrabold text-white font-mono flex items-center justify-between">
            <span>{stats.total} Products</span>
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-[11px] text-gray-500 font-mono">Dense vector indexed</p>
        </div>

        <div className="glass-panel p-4 border-white/5 bg-black/40 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Identified in Video</span>
          <div className="text-xl font-extrabold text-cyan-300 font-mono flex items-center justify-between">
            <span>{stats.matchedCount} Items</span>
            <Eye className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-[11px] text-cyan-400/80 font-mono">Matched to frame detections</p>
        </div>

        <div className="glass-panel p-4 border-white/5 bg-black/40 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Verified Deliveries</span>
          <div className="text-xl font-extrabold text-emerald-300 font-mono flex items-center justify-between">
            <span>{stats.deliveredCount} Confirmed</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[11px] text-emerald-400/80 font-mono">AI Visual Proof of Delivery</p>
        </div>

        <div className="glass-panel p-4 border-white/5 bg-black/40 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase">En Route Couriers</span>
          <div className="text-xl font-extrabold text-purple-300 font-mono flex items-center justify-between">
            <span>{stats.inTransitCount} Active</span>
            <Truck className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-[11px] text-purple-400/80 font-mono">Live transit corridors</p>
        </div>
      </div>

      {/* 3. Search, Filter & View Controls */}
      <div className="glass-panel p-4 border-white/[0.06] bg-black/40 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, brand, tracking # or object class..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Category & Status Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Categories</option>
              <option value="Apparel & Bags">Apparel & Bags</option>
              <option value="Transit & Vehicles">Transit & Vehicles</option>
              <option value="Outdoor Furniture">Outdoor Furniture</option>
              <option value="Smart City & Hardware">Smart City & Hardware</option>
            </select>

            <select
              value={selectedDeliveryStatus}
              onChange={(e) => setSelectedDeliveryStatus(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Handover Verified">Handover Verified</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="similarity">Highest Match %</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Product Name</option>
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {[
              { id: "catalog", label: `Catalog Grid (${filteredProducts.length})`, icon: ShoppingBag },
              { id: "video_matches", label: "Video Appearances & Timestamps", icon: Video },
              { id: "delivery_manifest", label: "Delivery Tracking & POD Log", icon: Truck }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewTab === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan font-bold"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
            Active Video: <strong className="text-white">{activeVideo?.filename || "Downtown Staging Feed"}</strong>
          </span>
        </div>
      </div>

      {/* 4. Active Tab Content Views */}
      {isLoading ? (
        <div className="glass-panel p-16 text-center border-white/5 bg-black/40 rounded-2xl space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <h4 className="text-sm font-bold text-white">Cross-referencing Video Detections...</h4>
          <p className="text-xs text-gray-400">Performing FAISS vector similarity matching against local product catalogs.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-panel p-16 text-center border-white/5 bg-black/40 rounded-2xl space-y-3">
          <Package className="w-10 h-10 text-gray-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Matching Products or Deliveries</h4>
          <p className="text-xs text-gray-400">Try broadening your search term or selecting "All Categories".</p>
        </div>
      ) : (
        <>
          {/* TAB 1: CATALOG GRID VIEW */}
          {viewTab === "catalog" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => {
                const hasAppearances = prod.appearances_in_video && prod.appearances_in_video.length > 0;
                return (
                  <div
                    key={prod.id}
                    className="glass-panel-glow border-white/[0.06] bg-black/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="space-y-3">
                      {/* Image & Badges */}
                      <div className="aspect-[4/3] rounded-xl bg-black/60 border border-white/5 overflow-hidden relative group-hover:border-cyan-500/30 transition-all">
                        <img 
                          src={prod.image_url} 
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Match Score Badge */}
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-500/40 shadow-glow-cyan flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{prod.similarity_score}% Vector Match</span>
                        </span>

                        {/* Delivery Status Badge */}
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border backdrop-blur-md ${getDeliveryStatusStyle(prod.delivery_status)}`}>
                          {prod.delivery_status}
                        </span>

                        {/* Video appearance indicator */}
                        {hasAppearances && (
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/85 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-white flex items-center justify-between">
                            <span className="text-cyan-300 font-bold flex items-center gap-1">
                              <Video className="w-3 h-3 text-cyan-400" />
                              Spotted in {prod.appearances_in_video.length} moments
                            </span>
                            <span className="text-gray-300">Class: <strong>{prod.matched_class}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Header Info */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                          <span className="uppercase text-gray-500 tracking-wider">{prod.brand}</span>
                          <span className="text-cyan-300 font-extrabold text-sm">{prod.formatted_price}</span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                          {prod.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      {/* Delivery Carrier & Location Tag */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono space-y-1">
                        <div className="flex items-center justify-between text-gray-300">
                          <span className="flex items-center gap-1 text-gray-400">
                            <Truck className="w-3 h-3 text-cyan-400" /> {prod.delivery_carrier}
                          </span>
                          <span className="text-gray-400 font-semibold">{prod.eta}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-[10px] truncate">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span>{prod.delivery_location}</span>
                        </div>
                      </div>

                      {/* Video Seek Buttons if spotted in video */}
                      {hasAppearances && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono text-gray-400 block">Jump to video appearance:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {prod.appearances_in_video.slice(0, 3).map((app, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  if (onSelectVideo) onSelectVideo(activeVideoId, app.timestamp);
                                }}
                                className="px-2 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="Click to seek video"
                              >
                                <Play className="w-2.5 h-2.5 fill-cyan-400" />
                                <span>{app.formatted_timestamp}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setSelectedProduct(prod)}
                        className="flex-1 btn-glass py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Item</span>
                      </button>

                      <button
                        onClick={() => setOrderModalProduct(prod)}
                        className="btn-primary py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1"
                        title="Dispatch or Order"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: VIDEO APPEARANCES & TIMESTAMPS */}
          {viewTab === "video_matches" && (
            <div className="space-y-4">
              <div className="glass-panel p-4 border-cyan-500/20 bg-cyan-950/10 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 font-bold flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  Showing timestamped products recognized in '{activeVideo?.filename || "Selected Video"}'
                </span>
                <span className="text-gray-400">Click any Play button to seek the video player</span>
              </div>

              <div className="space-y-3">
                {filteredProducts
                  .filter(p => p.appearances_in_video && p.appearances_in_video.length > 0)
                  .map((prod) => (
                    <div
                      key={prod.id}
                      className="glass-panel p-4 border-white/[0.06] bg-black/40 rounded-xl space-y-3 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={prod.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{prod.name}</h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                                {prod.matched_class}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{prod.brand} • {prod.formatted_price}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-1 rounded border ${getDeliveryStatusStyle(prod.delivery_status)}`}>
                            {prod.delivery_status}
                          </span>
                          <button
                            onClick={() => handleVerifyPod(prod)}
                            className="btn-glass px-2.5 py-1 text-xs font-mono flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verify POD</span>
                          </button>
                        </div>
                      </div>

                      {/* Appearance Timestamps Strip */}
                      <div className="bg-black/60 p-3 rounded-xl border border-white/5 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-400 mr-2 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" /> Video Timestamps:
                        </span>
                        {prod.appearances_in_video.map((app, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (onSelectVideo) onSelectVideo(activeVideoId, app.timestamp);
                            }}
                            className="px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                          >
                            <Play className="w-3 h-3 fill-cyan-400" />
                            <span>{app.formatted_timestamp}</span>
                            <span className="text-gray-400 text-[10px]">({Math.round(app.confidence * 100)}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY TRACKING & PROOF-OF-DELIVERY MANIFEST */}
          {viewTab === "delivery_manifest" && (
            <div className="space-y-4">
              <div className="glass-panel p-4 border-white/5 bg-black/40 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-gray-300 font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  Active Delivery Manifest & Proof-of-Delivery Chain of Custody
                </span>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredProducts, null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `delivery_manifest_${activeVideoId || "general"}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="btn-glass px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Manifest</span>
                </button>
              </div>

              <div className="glass-panel border-white/[0.06] bg-black/40 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-black/60 border-b border-white/10 text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Product & SKU</th>
                        <th className="p-3.5">Tracking Number</th>
                        <th className="p-3.5">Carrier Fleet</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Drop-off Destination</th>
                        <th className="p-3.5 text-right">Proof of Delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{prod.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">{prod.sku} • {prod.brand}</span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-cyan-300 font-semibold">{prod.tracking_number}</span>
                              <button
                                onClick={() => handleCopyTracking(prod.tracking_number)}
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                                title="Copy tracking"
                              >
                                {copiedTracking === prod.tracking_number ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300">
                            <div>{prod.delivery_carrier}</div>
                            <span className="text-[10px] text-gray-500">{prod.eta}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getDeliveryStatusStyle(prod.delivery_status)}`}>
                              {prod.delivery_status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="text-white">{prod.delivery_location}</div>
                            <span className="text-[10px] text-gray-500">Recip: {prod.recipient || "Operations Hub"}</span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleVerifyPod(prod)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verify POD</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* 5. ITEM INSPECTION MODAL DRAWER                                      */}
      {/* ==================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 border-white/15 bg-[#0a0a14] rounded-3xl max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin relative shadow-2xl">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-1/2 aspect-square rounded-2xl bg-black/60 border border-white/10 overflow-hidden relative">
                <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-black/80 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan">
                  {selectedProduct.similarity_score}% Vector Match
                </span>
              </div>

              <div className="sm:w-1/2 space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                    {selectedProduct.brand} • {selectedProduct.category}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1 leading-snug">{selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-extrabold text-cyan-400 font-mono">{selectedProduct.formatted_price}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {selectedProduct.stock_status} ({selectedProduct.stock_quantity} left)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {selectedProduct.description}
                </p>

                {/* Logistics telemetry */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tracking:</span>
                    <span className="text-cyan-300 font-bold">{selectedProduct.tracking_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Carrier:</span>
                    <span className="text-white">{selectedProduct.delivery_carrier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${getDeliveryStatusStyle(selectedProduct.delivery_status)}`}>
                      {selectedProduct.delivery_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">ETA:</span>
                    <span className="text-emerald-300 font-semibold">{selectedProduct.eta}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setOrderModalProduct(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 btn-primary py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>Order / Dispatch</span>
                  </button>
                  <button
                    onClick={() => {
                      handleVerifyPod(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="btn-glass py-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 text-emerald-300"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify POD</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. ORDER / DISPATCH MODAL                                            */}
      {/* ==================================================================== */}
      {orderModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 border-white/15 bg-[#0a0a14] rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setOrderModalProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Dispatch Delivery Request</span>
              <h3 className="text-lg font-bold text-white mt-1">Order {orderModalProduct.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Anchored to VideoSense AI Courier Fleet Routing.</p>
            </div>

            <form onSubmit={handleDispatchOrder} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Recipient Name</label>
                <input
                  type="text"
                  name="recipient"
                  defaultValue="Surveillance Operations Hub"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Destination Address / Zone</label>
                <input
                  type="text"
                  name="address"
                  defaultValue="Curbside Staging Zone #4, Avenue Sector"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Courier Carrier</label>
                <select
                  name="carrier"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="VideoSense Express Fleet">VideoSense Express Fleet</option>
                  <option value="EcoPedal Urban Couriers">EcoPedal Urban Couriers</option>
                  <option value="CityCourier Prime">CityCourier Prime</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-gray-300">
                <span>Subtotal (1 item):</span>
                <span className="text-cyan-400 font-bold text-sm">{orderModalProduct.formatted_price}</span>
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-glow-cyan"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm & Dispatch Courier</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. DISPATCH SUCCESS TOAST MODAL                                      */}
      {/* ==================================================================== */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 border-emerald-500/30 bg-[#0a0a14] rounded-3xl max-w-md w-full space-y-4 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <h3 className="text-lg font-bold text-white">Order Dispatched Successfully!</h3>
            <p className="text-xs text-gray-300">
              Tracking number <strong className="text-cyan-300 font-mono">{orderSuccess.tracking_number}</strong> has been generated and assigned to <strong className="text-white">{orderSuccess.carrier}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs font-mono space-y-1 text-left">
              <div>Order ID: <strong className="text-white">{orderSuccess.order_id}</strong></div>
              <div>Estimated Delivery: <strong className="text-emerald-300">{orderSuccess.estimated_delivery}</strong></div>
              <div>Destination: <strong className="text-gray-300">{orderSuccess.shipping_address}</strong></div>
            </div>

            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full btn-glass py-2 text-xs font-mono font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. VERIFIED PROOF OF DELIVERY MODAL                                  */}
      {/* ==================================================================== */}
      {verifiedPod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 border-emerald-500/40 bg-[#0a0a14] rounded-3xl max-w-lg w-full space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setVerifiedPod(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Cryptographic POD Certificate</span>
                <h3 className="text-base font-bold text-white">Visual Proof of Delivery Verified</h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono space-y-2 text-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Certificate ID:</span>
                <span className="text-white font-bold">{verifiedPod.certificate_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Video Timestamp:</span>
                <span className="text-cyan-300 font-bold">{verifiedPod.formatted_timestamp} ({verifiedPod.timestamp_seconds}s)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Confidence Level:</span>
                <span className="text-emerald-300 font-bold">{Math.round(verifiedPod.confidence_level * 100)}%</span>
              </div>
              <div className="border-t border-white/5 pt-2">
                <span className="text-gray-500 block mb-0.5">Telemetry Notes:</span>
                <p className="text-gray-300 text-[11px] leading-relaxed">{verifiedPod.notes}</p>
              </div>
              <div className="border-t border-white/5 pt-2 text-[10px] text-gray-500 truncate">
                Hash: {verifiedPod.cryptographic_hash}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onSelectVideo && activeVideoId) {
                    onSelectVideo(activeVideoId, verifiedPod.timestamp_seconds);
                    setVerifiedPod(null);
                  }
                }}
                className="flex-1 btn-primary py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jump to Video Player ({verifiedPod.formatted_timestamp})</span>
              </button>
              <button
                onClick={() => setVerifiedPod(null)}
                className="btn-glass px-4 py-2 text-xs font-mono font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
