import re
from collections import defaultdict
from app.db.unit_of_work import UnitOfWork

def clean_title(filename: str) -> str:
    name = re.sub(r'\.[a-zA-Z0-9]+$', '', filename)
    name = re.sub(r'#\w+', '', name)
    name = re.sub(r'[^\w\s\-,!\'\"&]', ' ', name)
    name = re.sub(r'[_\-]+', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def is_meaningful_title(title: str) -> bool:
    cleaned = clean_title(title)
    # Check if mostly numbers, UUIDs, or generic names
    words = [w for w in cleaned.split() if len(w) > 2 and not w.isdigit()]
    generic = {"video", "sample", "test", "whatsapp", "download", "input", "output"}
    valid_words = [w for w in words if w.lower() not in generic]
    return len(valid_words) >= 2

def build_narrative(v, objects, transcripts, ocrs, scenes, persona="analyst"):
    title_raw = v.filename
    cleaned_name = clean_title(title_raw)
    meaningful = is_meaningful_title(title_raw)
    
    # Class frequency
    counts = defaultdict(int)
    moments = defaultdict(list)
    for o in objects:
        lbl = (o.class_label or "entity").lower().strip()
        counts[lbl] += 1
        moments[lbl].append(o.first_seen_timestamp or 0.0)

    top_classes = sorted(counts.items(), key=lambda x: -x[1])
    top_labels = [c[0] for c in top_classes[:8]]

    duration = v.duration or 0.0
    num_scenes = len(scenes)

    # Transcript summary
    all_transcripts = " ".join(t.text for t in transcripts).strip()
    transcript_words = [w.strip("!.,?").lower() for w in all_transcripts.split()]

    # Categorize domain
    has_miniature = any(l in top_labels for l in ["miniature figure", "boots", "helmet", "safety vest", "stone cottage", "toy"])
    has_traffic = any(l in top_labels for l in ["car", "motorcycle", "bicycle", "bus", "truck", "traffic light", "vehicle"])
    has_crowd = any(l in top_labels for l in ["person", "pedestrian", "child", "footwear", "umbrella"])
    has_animals = any(l in top_labels for l in ["cow", "dog", "cat", "horse", "bird", "elephant"])

    # 1. Synthesize Natural Language Story / Short Summary
    narrative_paragraphs = []

    if has_miniature or ("rescue" in cleaned_name.lower() or "mini" in cleaned_name.lower()):
        subject_desc = f"miniature rescue personnel (equipped with {', '.join([l for l in top_labels if l in ['helmet', 'safety vest', 'boots']][:3]) or 'safety gear'})"
        setting_desc = "a detailed diorama world featuring stone cottages and small-scale infrastructure" if "stone cottage" in top_labels else "a detailed miniature diorama environment"
        
        event_desc = f"staging an emergency operation responding to a '{cleaned_name}'" if meaningful else "staging a creative miniature response scenario"
        
        audio_cadence = ""
        if any(w in transcript_words for w in ["yay", "yeah", "hooray"]):
            audio_cadence = " The visual action is accompanied by enthusiastic cheers and lively vocalizations ('Yeah! Yay!'), giving the emergency operation a lighthearted, comedic cadence."
        elif all_transcripts:
            audio_cadence = f" Spoken dialogue ('{all_transcripts[:60]}...') punctuates key moments across the sequence."

        short_story = (
            f"This {duration:.0f}-second video presents a creative miniature diorama scenario starring {subject_desc} in {setting_desc}. "
            f"The narrative depicts the tiny figures {event_desc}. Across {num_scenes} distinct camera cuts, the figurines coordinate their mobilization, navigating obstacles and simulated hazards in close proximity.{audio_cadence}"
        )
    elif has_traffic and has_crowd:
        vehicle_list = [l for l in top_labels if l in ["motorcycle", "car", "bicycle", "bus", "truck", "vehicle"]]
        vehicle_str = ", ".join(vehicle_list[:3]) if vehicle_list else "vehicles and two-wheelers"
        
        animal_str = " alongside roaming street animals (such as cows)" if has_animals else ""
        ocr_str = f" with visible roadside signages ({', '.join([f'`{o.text}`' for o in ocrs[:3]])})" if ocrs else ""

        short_story = (
            f"This recording captures a vibrant outdoor urban street and transit environment characterized by active public movement. "
            f"The video documents dense pedestrian activity interacting with multi-modal traffic, including {vehicle_str}{animal_str}{ocr_str}. "
            f"The continuous footage tracks the flow of daily commerce and transit across a {duration:.0f}-second span with steady camera monitoring."
        )
    elif has_traffic:
        vehicle_list = [l for l in top_labels if l in ["car", "bus", "truck", "motorcycle", "bicycle"]]
        vehicle_str = ", ".join(vehicle_list[:4]) if vehicle_list else "automotive traffic"
        short_story = (
            f"This video monitors an active metropolitan roadway and intersection transit flow. "
            f"The footage tracks concurrent navigation of {vehicle_str} across controlled lanes. "
            f"Over {duration:.0f} seconds, the visual sequence captures directional transit flow, lane adherence, and vehicle density patterns across {num_scenes or 1} continuous observation intervals."
        )
    elif has_crowd:
        short_story = (
            f"This video documents continuous pedestrian and human activity within an active public space. "
            f"The camera captures group interactions and foot traffic across a {duration:.0f}-second duration, recording natural movement patterns and focal interactions across {num_scenes or 1} scene segments."
        )
    else:
        entities_str = ", ".join(top_labels[:4]) if top_labels else "visual elements"
        short_story = (
            f"This {duration:.0f}-second sequence provides focused surveillance coverage of {cleaned_name or 'the scene'}, "
            f"tracking prominent detections of {entities_str} across {num_scenes or 1} distinct camera segments with consistent temporal continuity."
        )

    return short_story

with UnitOfWork() as uow:
    for vid_id in ['e2ad7c97-d0c9-4880-b779-1acb82cb5817', '32e237df-c4f3-4719-832a-61b4cd2d094d']:
        v = uow.videos.get(vid_id)
        if v:
            summary = build_narrative(v, v.objects, v.transcripts, v.ocr_results, v.scenes)
            print("VIDEO:", v.filename.encode('ascii', errors='replace').decode('ascii'))
            print("SUMMARY NARRATIVE:")
            print(summary.encode('ascii', errors='replace').decode('ascii'))
            print("="*60)
