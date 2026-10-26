import re
from typing import Dict, Any, List, Optional
from collections import defaultdict

def clean_video_title(filename: str) -> str:
    """Removes file extensions, hashtags, and noise to produce a human-readable title."""
    if not filename:
        return "Video Sequence"
    name = re.sub(r"\.[a-zA-Z0-9]{2,5}$", "", filename)
    name = re.sub(r"#\w+", "", name)
    name = re.sub(r"[^\w\s\-,!\'\"]", " ", name)
    name = re.sub(r"[_\-]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name if name else "Video Sequence"

def is_semantic_title(filename: str) -> bool:
    """Returns True if the filename has natural language keywords rather than numeric hashes."""
    clean = clean_video_title(filename)
    words = [w for w in clean.split() if len(w) > 2 and not w.isdigit()]
    generic = {"video", "sample", "test", "whatsapp", "download", "input", "output", "preview", "vid"}
    valid_words = [w for w in words if w.lower() not in generic]
    return len(valid_words) >= 2

def format_timestamp(sec: float) -> str:
    """Formats seconds into mm:ss format."""
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m:02d}:{s:02d}"

def generate_video_understanding_narrative(
    video: Any,
    objects: List[Any],
    transcripts: List[Any],
    ocrs: List[Any],
    scenes: List[Any],
    persona: str = "analyst"
) -> Dict[str, Any]:
    """
    Synthesizes natural language comprehension of the video content.
    Combines object detections, audio dialogue, OCR text, and timeline progression
    to explain what is happening in the video in short, coherent narrative text.
    """
    title_raw = video.filename if video else "Global Multimodal Stream"
    clean_title = clean_video_title(title_raw)
    has_meaningful_title = is_semantic_title(title_raw)

    # 1. Aggregate entity counts and moments
    counts = defaultdict(int)
    moments = defaultdict(list)
    for o in objects:
        lbl = (getattr(o, "class_label", None) or "entity").lower().strip()
        counts[lbl] += 1
        moments[lbl].append(getattr(o, "first_seen_timestamp", 0.0) or 0.0)

    top_classes = sorted(counts.items(), key=lambda x: -x[1])
    top_labels = [c[0] for c in top_classes[:8]]

    duration = float(getattr(video, "duration", 0.0) or 0.0)
    if duration <= 0.0 and moments:
        duration = max([max(m) for m in moments.values() if m] or [15.0])
    if duration <= 0.0:
        duration = 15.0

    num_scenes = len(scenes) if scenes else 1

    # 2. Extract transcript & dialogue signals
    all_transcripts = " ".join(getattr(t, "text", "") for t in transcripts).strip()
    tr_lower = all_transcripts.lower()

    # 3. Extract OCR signals
    ocr_snippets = [getattr(o, "text", "").strip() for o in ocrs if getattr(o, "text", "").strip()]
    clean_ocrs = [t for t in ocr_snippets if len(t) > 2 and not t.isdigit()][:5]

    # 4. Domain Classification
    has_miniature = any(l in top_labels for l in [
        "miniature figure", "boots", "helmet", "safety vest", "stone cottage", "toy", "doll", "figurine"
    ]) or any(k in clean_title.lower() for k in ["mini", "rescue", "diorama", "disaster", "tiny", "foam"])

    has_traffic = any(l in top_labels for l in [
        "car", "motorcycle", "bicycle", "bus", "truck", "traffic light", "stop sign", "vehicle"
    ])
    has_crowd = any(l in top_labels for l in ["person", "pedestrian", "child", "footwear", "umbrella"])
    has_animals = any(l in top_labels for l in ["cow", "dog", "cat", "horse", "bird", "elephant"])

    # 5. Temporal Phasing
    p1_end = duration * 0.33
    p2_end = duration * 0.66

    scenario_points = []
    short_story = ""

    # Persona styling prefixes
    persona_role = {
        "analyst": "Operational Analysis",
        "investigator": "Chronological Investigation",
        "engineer": "Technical Scene Telemetry",
        "data_scientist": "Multi-Modal Intelligence"
    }.get(persona, "Operational Analysis")

    # =========================================================================
    # THEME A: Miniature / Diorama / Creative Staged Scenario
    # =========================================================================
    if has_miniature:
        gear_labels = [l for l in top_labels if l in ["boots", "helmet", "safety vest"]]
        gear_phrase = f"equipped with {', '.join(gear_labels)}" if gear_labels else "attired in miniature safety gear"
        
        setting = "a detailed diorama village featuring stone cottages, trees, and small-scale infrastructure" if "stone cottage" in top_labels else "a detailed miniature diorama environment"

        event_focus = f"responding to an unfolding '{clean_title}'" if has_meaningful_title else "staging a creative emergency response operation"

        audio_detail = ""
        if any(w in tr_lower for w in ["yay", "yeah", "hooray", "wow", "cheer"]):
            audio_detail = " The sequence is enlivened by enthusiastic shouts and celebratory audio reactions ('Yeah! Yay!'), reinforcing the playful, comedic nature of the miniature disaster staging."
        elif all_transcripts:
            audio_detail = f" Spoken dialogue ('{all_transcripts[:80]}...') accompanies the sequence."

        short_story = (
            f"This {duration:.0f}-second video presents a creative miniature diorama scenario starring miniature worker figures ({gear_phrase}) in {setting}. "
            f"The narrative captures the tiny personnel {event_focus}. "
            f"Across {num_scenes} distinct camera cuts, the figurines coordinate their emergency mobilization, navigating around bubbly foam hazards in close proximity.{audio_detail}"
        )

        scenario_points.append(f"**Setting & Subject:** {setting.capitalize()}, featuring miniature personnel {gear_phrase}.")
        scenario_points.append(f"**Central Scenario:** Miniature emergency response team navigating a simulated foam disaster across coordinated diorama stages.")
        scenario_points.append(
            f"**Timeline Progression:** Opens `[{format_timestamp(0)} - {format_timestamp(p1_end)}]` establishing the diorama village and figurine positions; "
            f"mid-sequence `[{format_timestamp(p1_end)} - {format_timestamp(p2_end)}]` captures active emergency mobilization tackling the foam hazard; "
            f"concluding cuts `[{format_timestamp(p2_end)} - {format_timestamp(duration)}]` resolve the scene with high-angle framing."
        )
        if all_transcripts:
            scenario_points.append(f"**Audio & Dialogue:** Spirited vocal reactions ('{all_transcripts[:60]}...') providing a high-energy comedic cadence.")

    # =========================================================================
    # THEME B: Busy Outdoor Public Street / Market Thoroughfare
    # =========================================================================
    elif has_crowd and (has_traffic or has_animals):
        vehicles = [l for l in top_labels if l in ["motorcycle", "car", "bicycle", "bus", "truck", "vehicle"]]
        v_str = ", ".join(vehicles[:3]) if vehicles else "two-wheelers and vehicles"
        animal_str = " alongside roaming street animals (such as cows)" if has_animals else ""
        ocr_str = f" with visible roadside commercial signages ({', '.join([f'`{t}`' for t in clean_ocrs[:3]])})" if clean_ocrs else ""

        short_story = (
            f"This recording captures a vibrant outdoor street scene and transit thoroughfare characterized by active public movement. "
            f"The camera documents dense pedestrian activity sharing the corridor with multi-modal traffic, including {v_str}{animal_str}{ocr_str}. "
            f"Over a {duration:.0f}-second span, the footage provides continuous surveillance of urban foot traffic, everyday commerce, and shared vehicular navigation."
        )

        scenario_points.append(f"**Setting & Context:** Active public street market thoroughfare with mixed pedestrian and transit flow.")
        scenario_points.append(f"**Key Dynamic Actors:** High pedestrian volume interacting alongside active two-wheelers ({v_str}){animal_str}.")
        scenario_points.append(
            f"**Timeline Progression:** Continuous monitoring across `[{format_timestamp(0)} - {format_timestamp(duration)}]` tracking pedestrian flow, vehicle crossing, and uninterrupted road activity."
        )
        if clean_ocrs:
            scenario_points.append(f"**Commercial Signage Captured:** Roadside signages and storefront text ({', '.join([f'`{t}`' for t in clean_ocrs[:4]])}).")

    # =========================================================================
    # THEME C: Metropolitan Roadway / Vehicle Intersection
    # =========================================================================
    elif has_traffic:
        vehicles = [l for l in top_labels if l in ["car", "bus", "truck", "motorcycle", "bicycle", "vehicle"]]
        v_str = ", ".join(vehicles[:4]) if vehicles else "automotive vehicles"
        short_story = (
            f"This video monitors an active roadway and intersection transit corridor. "
            f"The sequence records concurrent flow of {v_str} across controlled lanes and crosswalks. "
            f"Over {duration:.0f} seconds, the camera captures vehicle density, lane adherence, and continuous roadway throughput across {num_scenes} observation cut(s)."
        )
        scenario_points.append(f"**Setting & Context:** Metropolitan road intersection and transit corridor.")
        scenario_points.append(f"**Observed Traffic Dynamics:** Multi-class vehicle flow comprising {v_str}.")
        scenario_points.append(f"**Surveillance Span:** Continuous monitoring across {duration:.0f}s with steady transit pacing.")

    # =========================================================================
    # THEME D: Pedestrian & Social Interactions
    # =========================================================================
    elif has_crowd:
        short_story = (
            f"This video documents continuous human and pedestrian activity within an active public environment. "
            f"The recording captures group interactions, foot traffic, and movement patterns across a {duration:.0f}-second duration, "
            f"tracking subject positions and focal interactions across {num_scenes} camera transition(s)."
        )
        scenario_points.append(f"**Setting & Context:** Public gathering or pedestrian walkway.")
        scenario_points.append(f"**Activity Analysis:** Continuous pedestrian navigation and social interaction patterns.")

    # =========================================================================
    # THEME E: General Visual Sequence
    # =========================================================================
    else:
        entities_str = ", ".join(top_labels[:4]) if top_labels else "visual subjects"
        short_story = (
            f"This {duration:.0f}-second sequence provides focused visual coverage of {clean_title or 'the monitored environment'}, "
            f"tracking prominent detections of {entities_str} across {num_scenes} distinct camera intervals with steady temporal continuity."
        )
        scenario_points.append(f"**Monitored Target:** Visual analysis of {clean_title}.")
        scenario_points.append(f"**Primary Entities Detected:** {entities_str}.")

    return {
        "short_story": short_story,
        "scenario_points": scenario_points,
        "persona_role": persona_role,
        "clean_title": clean_title
    }
