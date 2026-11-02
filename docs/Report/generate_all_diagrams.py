import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('docs/report/diagrams', exist_ok=True)
plt.rcParams['font.family'] = 'DejaVu Sans'
arrow_style = dict(arrowstyle='->', lw=1.8, color='#334155')

def draw_diagram(fig_path, title, boxes, arrows):
    fig, ax = plt.subplots(figsize=(12, 6.2), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.2)
    ax.axis('off')
    
    # Title
    ax.text(6, 5.8, title, ha='center', va='center', fontsize=12, fontweight='bold', color='#0f172a')
    
    for x, y, w, h, bg, border, txt in boxes:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.1,rounding_size=0.15',
                                      facecolor=bg, edgecolor=border, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, txt, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#1e293b')
        
    for x1, y1, x2, y2 in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1), arrowprops=arrow_style)
        
    plt.savefig(fig_path, bbox_inches='tight')
    plt.close()
    print(f'Saved {fig_path}')

# Fig 2.2: YOLO-Based Object Detection Workflow
b_2_2 = [
    (0.4, 3.0, 1.8, 1.6, '#f0fdf4', '#16a34a', 'Input Frame\n640x640x3\nNormalized RGB\nTensor'),
    (2.6, 2.6, 2.3, 2.4, '#eff6ff', '#2563eb', 'CSPDarknet Backbone\n---\nConv + C2f Modules\nP1 (320x320)\nP2 (160x160)\nP3 (80x80)\nP4 (40x40)\nP5 (20x20)'),
    (5.3, 2.6, 2.3, 2.4, '#fefce8', '#ca8a04', 'PANet Feature Neck\n---\nTop-Down Path\nBottom-Up Path\nMulti-Scale Feature\nPyramid Fusion'),
    (8.0, 2.6, 2.0, 2.4, '#faf5ff', '#9333ea', 'Decoupled Head\n---\nClass Head (BCE)\nBox Head\n(CIoU + DFL Loss)\nAnchor-Free Output'),
    (10.3, 3.0, 1.4, 1.6, '#fff1f2', '#e11d48', 'NMS Filtering\n---\nIoU: 0.45\nConf: 0.35\nFinal Detections'),
    (1.5, 0.7, 9.0, 1.2, '#f8fafc', '#64748b', 'Multi-Scale Feature Hierarchy & Loss Formulations:\nClassification Loss: Binary Cross-Entropy  |  Bounding Box Regression: CIoU + Distribution Focal Loss (DFL)')
]
a_2_2 = [(2.2, 3.8, 2.6, 3.8), (4.9, 3.8, 5.3, 3.8), (7.6, 3.8, 8.0, 3.8), (10.0, 3.8, 10.3, 3.8)]
draw_diagram('docs/report/diagrams/fig_2_2_yolo_detection.png',
             'YOLOv8 OBJECT DETECTION WORKFLOW & MULTI-SCALE FEATURE EXTRACTION',
             b_2_2, a_2_2)

# Fig 2.3: Grounding DINO Open-Vocabulary Concept
b_2_3 = [
    (0.5, 3.6, 2.2, 1.4, '#eff6ff', '#3b82f6', 'Image Backbone\nSwin Transformer\nMulti-Scale Vision Tokens'),
    (0.5, 1.4, 2.2, 1.4, '#fdf2f8', '#ec4899', 'Text Backbone\nBERT / RoBERTa\nNatural Language Prompts'),
    (3.5, 2.0, 3.0, 2.8, '#f0fdf4', '#22c55e', 'Feature Enhancer\n---\nBi-Directional Cross-Attention\n(Image-to-Text Attention)\n(Text-to-Image Attention)\nJoint Latent Space Alignment'),
    (7.2, 2.0, 2.6, 2.8, '#faf5ff', '#a855f7', 'Cross-Modality Decoder\n---\nLanguage-Guided Query\nSelection & Contrastive\nDot-Product Grounding'),
    (10.3, 2.5, 1.4, 1.8, '#fff7ed', '#f97316', 'Open-Vocabulary\nDetection Output\n---\nArbitrary Objects\nZero-Shot Prompts')
]
a_2_3 = [(2.7, 4.3, 3.5, 3.7), (2.7, 2.1, 3.5, 3.0), (6.5, 3.4, 7.2, 3.4), (9.8, 3.4, 10.3, 3.4)]
draw_diagram('docs/report/diagrams/fig_2_3_grounding_dino.png',
             'GROUNDING DINO: TEXT-PROMPT OPEN-VOCABULARY DETECTION CONTEXT',
             b_2_3, a_2_3)

# Fig 2.4: Video Context Summarization Pipeline
b_2_4 = [
    (0.4, 3.6, 2.2, 1.4, '#eff6ff', '#2563eb', 'Vision Detections\nObject Classes\nCoordinates [x1,y1,x2,y2]\nTimestamps & Counts'),
    (0.4, 1.4, 2.2, 1.4, '#f0fdf4', '#16a34a', 'Audio & Speech Track\nWhisper ASR Text\nSpeaker Utterances\nTimestamp Boundaries'),
    (3.2, 2.0, 2.7, 2.8, '#fefce8', '#ca8a04', 'Temporal Aggregator\n---\nEntity Grouping\nInterval Clustering [ts, te]\nFrequency Matrix\nAction Event Detection'),
    (6.5, 2.0, 2.7, 2.8, '#faf5ff', '#9333ea', 'Context Formulator\n---\nStructured Prompt Engine\nStrict Grounding Rules\nTemporal Anchoring\nZero-Hallucination Guard'),
    (9.7, 2.0, 2.0, 2.8, '#ecfdf5', '#059669', 'Output Summaries\n---\nExecutive Narrative\nAction Highlights\nTimeline Log\nVerified Entities')
]
a_2_4 = [(2.6, 4.3, 3.2, 3.7), (2.6, 2.1, 3.2, 3.0), (5.9, 3.4, 6.5, 3.4), (9.2, 3.4, 9.7, 3.4)]
draw_diagram('docs/report/diagrams/fig_2_4_context_summarization.png',
             'GROUNDED VIDEO CONTEXT SUMMARIZATION PIPELINE',
             b_2_4, a_2_4)

# Fig 4.1: Overall System Architecture of VideoSense AI
b_4_1 = [
    (0.5, 4.2, 11.0, 1.2, '#f8fafc', '#0284c7', 'PRESENTATION LAYER (Frontend Client - React 19, TailwindCSS, Canvas Video Overlay, Lucide UI)\n[Dashboard Overview | Video Timeline | Semantic Search | Video Chat | Analytics Hub | Reports Center | POD Console]'),
    (0.5, 2.4, 5.2, 1.5, '#eff6ff', '#2563eb', 'APPLICATION & API GATEWAY\nFastAPI REST Endpoints + WebSocket Streams\nJWT Authentication, Celery Task Queuing, SQLite / PostgreSQL ORM'),
    (6.3, 2.4, 5.2, 1.5, '#fefce8', '#d97706', 'STORAGE & VECTOR DATABASE\nDisk Blob Storage (MP4, Thumbnails, Keyframes)\nFAISS / ChromaDB Vector Store for Semantic Search\nStructured SQLite Schema for Detections & Metadata'),
    (0.5, 0.4, 11.0, 1.6, '#f5f3ff', '#7c3aed', 'AI INFERENCE ENGINE & COMPUTE SERVICES (PyTorch, Triton Server, CUDA acceleration)\n[Temporal Frame Sampler] | [YOLOv8 Detection] | [Grounding DINO Open-Vocab] | [Whisper ASR] | [EasyOCR] | [Grounded Summarizer]')
]
a_4_1 = [(6.0, 4.2, 6.0, 3.9), (3.1, 2.4, 3.1, 2.0), (8.9, 2.4, 8.9, 2.0)]
draw_diagram('docs/report/diagrams/fig_4_1_system_architecture.png',
             'OVERALL SYSTEM ARCHITECTURE OF VIDEOSENSE AI',
             b_4_1, a_4_1)

# Fig 4.2: Data Flow Diagram of VideoSense AI
b_4_2 = [
    (0.4, 3.2, 1.8, 1.6, '#f1f5f9', '#475569', 'User Upload\nVideo File (MP4)\nPrompts & Config'),
    (2.6, 4.0, 2.2, 1.4, '#dbeafe', '#1d4ed8', 'Video Stream\nDemuxing & Frame\nSampling (1 fps)'),
    (2.6, 1.6, 2.2, 1.4, '#dcfce7', '#15803d', 'Audio Stream\n16 kHz Resample\nWhisper ASR'),
    (5.3, 4.0, 2.4, 1.4, '#fef3c7', '#b45309', 'Perception Engine\nYOLOv8 + Grounding\nDINO + EasyOCR'),
    (5.3, 1.6, 2.4, 1.4, '#ede9fe', '#6d28d9', 'Speech Transcripts\nWord Timestamping\nTopic Tagging'),
    (8.2, 2.6, 2.0, 2.0, '#fae8ff', '#a21caf', 'Multimodal\nFusion & Context\nSummarizer'),
    (10.5, 2.6, 1.2, 2.0, '#ccfbf1', '#0f766e', 'Frontend\nUI & Dossier\nExport')
]
a_4_2 = [
    (2.2, 4.0, 2.6, 4.7), (2.2, 3.5, 2.6, 2.3),
    (4.8, 4.7, 5.3, 4.7), (4.8, 2.3, 5.3, 2.3),
    (7.7, 4.7, 8.2, 4.0), (7.7, 2.3, 8.2, 3.2),
    (10.2, 3.6, 10.5, 3.6)
]
draw_diagram('docs/report/diagrams/fig_4_2_data_flow.png',
             'DATA FLOW DIAGRAM OF VIDEOSENSE AI',
             b_4_2, a_4_2)

# Fig 5.1: Video Upload and Multimodal Inference Workflow
b_5_1 = [
    (0.5, 3.2, 2.0, 1.6, '#dbeafe', '#2563eb', 'Step 1: Ingestion\nDrag & Drop Video\nValidate Format\nSelect Detection Mode\n(YOLO / DINO / Hybrid)'),
    (3.0, 3.2, 2.2, 1.6, '#fef3c7', '#d97706', 'Step 2: Task Dispatch\nFastAPI Background Task\nGenerate Unique Video ID\nExtract Audio & Keyframes'),
    (5.7, 3.2, 2.3, 1.6, '#f3e8ff', '#9333ea', 'Step 3: Inference Loop\nBatch Tensor Passing\nBounding Box Detection\nConfidence Thresholding'),
    (8.5, 3.2, 2.0, 1.6, '#dcfce7', '#16a34a', 'Step 4: Persistence\nStore Detections DB\nUpdate SQLite Schema\nBroadcast via WS'),
    (4.0, 0.8, 4.0, 1.5, '#ecfeff', '#0891b2', 'Step 5: Context Synthesis & UI Presentation\nSynthesize Summary Cards | Render Video Player with Bounding Boxes | Enable Search & Q&A')
]
a_5_1 = [
    (2.5, 4.0, 3.0, 4.0), (5.2, 4.0, 5.7, 4.0), (8.0, 4.0, 8.5, 4.0),
    (9.5, 3.2, 8.0, 1.6), (4.0, 1.6, 1.5, 3.2)
]
draw_diagram('docs/report/diagrams/fig_5_1_upload_inference_workflow.png',
             'VIDEO UPLOAD AND MULTIMODAL INFERENCE WORKFLOW',
             b_5_1, a_5_1)

# Fig 7.1: Proposed End-to-End Workflow of VideoSense AI
b_7_1 = [
    (0.4, 2.2, 1.8, 2.2, '#f8fafc', '#334155', 'Input Phase\n---\nRaw Multi-Format Video\nUser Natural Prompts\nDomain Configs'),
    (2.6, 2.2, 2.0, 2.2, '#eff6ff', '#2563eb', 'Ingestion & Stride\n---\nFFmpeg Decoupling\nFrame Sampling (1fps)\n16kHz Audio Resample'),
    (5.0, 2.2, 2.2, 2.2, '#fefce8', '#ca8a04', 'Deep Perception\n---\nYOLOv8 Detection\nGrounding DINO Open-Set\nWhisper ASR Speech\nEasyOCR Text in Frame'),
    (7.6, 2.2, 2.0, 2.2, '#faf5ff', '#9333ea', 'Intelligence Engine\n---\nTemporal Aggregation\nCross-Modal Fusion\nStrict Grounded Summary\nVector Embedding'),
    (10.0, 2.2, 1.6, 2.2, '#ecfdf5', '#059669', 'Output Portal\n---\nInteractive UI\nSemantic Search\nReports Center\nPDF / JSON Export')
]
a_7_1 = [(2.2, 3.3, 2.6, 3.3), (4.6, 3.3, 5.0, 3.3), (7.2, 3.3, 7.6, 3.3), (9.6, 3.3, 10.0, 3.3)]
draw_diagram('docs/report/diagrams/fig_7_1_end_to_end_workflow.png',
             'PROPOSED END-TO-END WORKFLOW OF VIDEOSENSE AI',
             b_7_1, a_7_1)

print('All 7 diagrams generated successfully!')
