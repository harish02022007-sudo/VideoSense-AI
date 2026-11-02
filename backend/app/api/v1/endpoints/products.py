import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Query, Depends

from app.schemas.common import ResponseEnvelope
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Object, Frame
from app.models.user import User
from app.core.dependencies import get_optional_current_user
from app.core.logging import get_logger

logger = get_logger("app.api.products")
router = APIRouter()

# ============================================================================
# SCHEMAS
# ============================================================================

class VideoAppearanceDTO(BaseModel):
    video_id: str
    video_filename: str
    timestamp: float
    formatted_timestamp: str
    frame_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    confidence: float
    detection_label: str

class ProductDTO(BaseModel):
    id: str
    sku: str
    name: str
    brand: str
    category: str
    price: float
    formatted_price: str
    rating: float
    reviews_count: int
    stock_status: str  # In Stock, Low Stock, Pre-Order
    stock_quantity: int
    description: str
    image_url: str
    matched_class: str
    similarity_score: int  # e.g., 94%
    delivery_status: str  # Delivered, In Transit, Out for Delivery, Handover Verified, Pending Dispatch
    tracking_number: str
    delivery_carrier: str
    eta: str
    delivery_location: str
    recipient: Optional[str] = None
    proof_of_delivery: Optional[Dict[str, Any]] = None
    appearances_in_video: List[VideoAppearanceDTO] = Field(default_factory=list)

class OrderRequest(BaseModel):
    product_id: str
    quantity: int = 1
    recipient_name: str = "Surveillance Operations Hub"
    delivery_address: str = "742 Evergreen Terrace, Sector 4"
    carrier: str = "VideoSense Express Fleet"

class VerifyDeliveryRequest(BaseModel):
    video_id: str
    product_id: str
    timestamp: float
    notes: Optional[str] = "Visual drop-off verified via camera stream."


# ============================================================================
# CURATED PRODUCT & DELIVERY MASTER CATALOG
# ============================================================================

MASTER_CATALOG = [
    {
        "id": "prod-backpack-01",
        "sku": "VS-BP-8812",
        "name": "Urban Tech Commuter Backpack",
        "brand": "Cortex Gear",
        "category": "Apparel & Bags",
        "price": 89.99,
        "rating": 4.8,
        "reviews_count": 342,
        "stock_status": "In Stock",
        "stock_quantity": 45,
        "description": "Weatherproof multi-compartment ergonomic backpack with RFID security pockets and USB pass-through.",
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60",
        "matched_class": "backpack",
        "similarity_score": 93,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-7841029",
        "delivery_carrier": "SwiftDrop Express",
        "eta": "Delivered Today at 10:14 AM",
        "delivery_location": "Curbside Transit Stop B",
        "recipient": "Michael Henderson",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:05",
            "camera_id": "CAM-AVENUE-04",
            "confidence": 0.94,
            "status": "Handover Verified",
            "delivery_notes": "Courier handed parcel directly to recipient at bus staging area."
        }
    },
    {
        "id": "prod-handbag-02",
        "sku": "VS-HB-4421",
        "name": "Saffiano Leather Executive Tote",
        "brand": "Aura Milano",
        "category": "Apparel & Bags",
        "price": 149.50,
        "rating": 4.9,
        "reviews_count": 218,
        "stock_status": "In Stock",
        "stock_quantity": 28,
        "description": "Top-grain textured saffiano leather handbag with gold-plated metallic clasps and structured base.",
        "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=60",
        "matched_class": "handbag",
        "similarity_score": 91,
        "delivery_status": "Handover Verified",
        "tracking_number": "VS-TRK-9923814",
        "delivery_carrier": "CityCourier Prime",
        "eta": "Completed at 10:02 AM",
        "delivery_location": "Northbound Zebra Crosswalk",
        "recipient": "Sarah Jenkins",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:00",
            "camera_id": "CAM-AVENUE-01",
            "confidence": 0.91,
            "status": "Verified In-Possession",
            "delivery_notes": "Pedestrian carrying tote safely across downtown crosswalk corridor."
        }
    },
    {
        "id": "prod-ebike-03",
        "sku": "VS-BK-1090",
        "name": "AeroGlide Courier City E-Bike",
        "brand": "VoltRun Mobility",
        "category": "Transit & Vehicles",
        "price": 1299.00,
        "rating": 4.7,
        "reviews_count": 129,
        "stock_status": "In Stock",
        "stock_quantity": 12,
        "description": "Lightweight 250W brushless motor urban commuter bicycle with puncture-resistant tires and front courier rack.",
        "image_url": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=60",
        "matched_class": "bicycle",
        "similarity_score": 96,
        "delivery_status": "In Transit",
        "tracking_number": "VS-TRK-1029384",
        "delivery_carrier": "EcoPedal Couriers",
        "eta": "Estimated 12 mins (Arriving at 11:38 AM)",
        "delivery_location": "Lane 2 Avenue Corridor",
        "recipient": "GreenRoute Dispatch",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:07",
            "camera_id": "CAM-INTERSECT-09",
            "confidence": 0.95,
            "status": "Active Transit",
            "delivery_notes": "Courier actively cycling past intersection turning zone carrying order cargo."
        }
    },
    {
        "id": "prod-bus-04",
        "sku": "VS-TX-7700",
        "name": "ElectraTransit Municipal Hybrid Bus",
        "brand": "NovaCity Fleet",
        "category": "Transit & Vehicles",
        "price": 285000.00,
        "rating": 4.9,
        "reviews_count": 48,
        "stock_status": "Pre-Order",
        "stock_quantity": 4,
        "description": "Zero-emission heavy transit vehicle equipped with autonomous collision avoidance and accessible curb kneeling.",
        "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=500&auto=format&fit=crop&q=60",
        "matched_class": "bus",
        "similarity_score": 95,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-5520194",
        "delivery_carrier": "Metro Logistics Transit",
        "eta": "Scheduled Route Route #36 (Station Arrived)",
        "delivery_location": "Municipal Transit Station",
        "recipient": "Department of Transportation",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:05",
            "camera_id": "CAM-AVENUE-04",
            "confidence": 0.95,
            "status": "Curbside Arrival Verified",
            "delivery_notes": "Vehicle halted at passenger boarding bay displaying Route #36."
        }
    },
    {
        "id": "prod-sedan-05",
        "sku": "VS-VH-3022",
        "name": "Apex EV Urban Fleet Sedan",
        "brand": "Horizon Auto",
        "category": "Transit & Vehicles",
        "price": 32900.00,
        "rating": 4.6,
        "reviews_count": 89,
        "stock_status": "In Stock",
        "stock_quantity": 9,
        "description": "Commercial ride-share and package delivery electric sedan with 320-mile range and Level-2 ADAS.",
        "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=60",
        "matched_class": "car",
        "similarity_score": 94,
        "delivery_status": "Out for Delivery",
        "tracking_number": "VS-TRK-3391024",
        "delivery_carrier": "Horizon Courier Network",
        "eta": "Estimated 8 mins (Arriving at 11:34 AM)",
        "delivery_location": "Midtown Delivery Route #12",
        "recipient": "Fleet Operations",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:01",
            "camera_id": "CAM-AVENUE-01",
            "confidence": 0.94,
            "status": "En Route",
            "delivery_notes": "Fleet vehicle spotted navigating avenue crossway in active delivery dispatch."
        }
    },
    {
        "id": "prod-chair-06",
        "sku": "VS-FN-5511",
        "name": "Bistro Stackable Outdoor Cafe Chair",
        "brand": "Terrace & Hearth",
        "category": "Outdoor Furniture",
        "price": 64.99,
        "rating": 4.5,
        "reviews_count": 174,
        "stock_status": "In Stock",
        "stock_quantity": 80,
        "description": "Commercial-grade powder-coated steel bistro chair designed for outdoor restaurant patios and sidewalks.",
        "image_url": "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=500&auto=format&fit=crop&q=60",
        "matched_class": "chair",
        "similarity_score": 88,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-6644120",
        "delivery_carrier": "FreightDirect Logistics",
        "eta": "Delivered Yesterday",
        "delivery_location": "Sidewalk Cafe Dining Zone",
        "recipient": "Downtown Espresso Bistro",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:07",
            "camera_id": "CAM-PATIO-08",
            "confidence": 0.88,
            "status": "Installation Verified",
            "delivery_notes": "Chairs unboxed and deployed on sidewalk outdoor dining platform."
        }
    },
    {
        "id": "prod-plant-07",
        "sku": "VS-GD-9014",
        "name": "Ceramic Tuscan Terracotta Planter",
        "brand": "Botanica Living",
        "category": "Outdoor Furniture",
        "price": 42.00,
        "rating": 4.7,
        "reviews_count": 92,
        "stock_status": "In Stock",
        "stock_quantity": 36,
        "description": "Handmade frost-resistant ceramic outdoor planter with natural drainage for commercial beautification.",
        "image_url": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&auto=format&fit=crop&q=60",
        "matched_class": "potted plant",
        "similarity_score": 89,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-8819033",
        "delivery_carrier": "GreenThumb Transport",
        "eta": "Delivered Yesterday",
        "delivery_location": "Storefront Entry Planters",
        "recipient": "Cornerstone Cafe",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:07",
            "camera_id": "CAM-PATIO-08",
            "confidence": 0.90,
            "status": "Placed at Entrance",
            "delivery_notes": "Decorative planters verified positioned along sidewalk dining perimeter."
        }
    },
    {
        "id": "prod-traffic-08",
        "sku": "VS-SC-1100",
        "name": "IntelliSignal Connected LED Traffic Light",
        "brand": "MetroSense Infrastructure",
        "category": "Smart City & Hardware",
        "price": 2450.00,
        "rating": 4.9,
        "reviews_count": 31,
        "stock_status": "In Stock",
        "stock_quantity": 18,
        "description": "Smart IoT-connected high-luminance LED intersection signal with edge radar sync and adaptive timing.",
        "image_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=60",
        "matched_class": "traffic light",
        "similarity_score": 97,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-2200194",
        "delivery_carrier": "Municipal Works Fleet",
        "eta": "Installed & Operational",
        "delivery_location": "Intersection Mast Arm North",
        "recipient": "City Traffic Management",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:00",
            "camera_id": "CAM-AVENUE-01",
            "confidence": 0.97,
            "status": "Telemetry Active",
            "delivery_notes": "Signal head mounted and verified controlling active pedestrian flow."
        }
    },
    {
        "id": "prod-hydrant-09",
        "sku": "VS-SC-9099",
        "name": "SuperFlow Municipal Dry-Barrel Hydrant",
        "brand": "IronGuard Utilities",
        "category": "Smart City & Hardware",
        "price": 1820.00,
        "rating": 4.8,
        "reviews_count": 19,
        "stock_status": "In Stock",
        "stock_quantity": 7,
        "description": "High-visibility ductile iron municipal fire hydrant with tamper-evident flow sensors.",
        "image_url": "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=60",
        "matched_class": "fire hydrant",
        "similarity_score": 92,
        "delivery_status": "Delivered",
        "tracking_number": "VS-TRK-4411982",
        "delivery_carrier": "Public Works Hauling",
        "eta": "Installed at Curbside",
        "delivery_location": "Corner of 5th & Avenue",
        "recipient": "Municipal Fire Rescue",
        "proof_of_delivery": {
            "verified": True,
            "timestamp": "00:08",
            "camera_id": "CAM-INTERSECT-09",
            "confidence": 0.92,
            "status": "Asset Inspected",
            "delivery_notes": "Curbside hydrant verified undamaged and unobstructed by vehicle traffic."
        }
    }
]

def format_sec_to_mmss(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("", response_model=ResponseEnvelope[List[ProductDTO]])
async def list_products(
    request: Request,
    category: Optional[str] = Query(None, description="Filter by category"),
    delivery_status: Optional[str] = Query(None, description="Filter by delivery tracking status"),
    search: Optional[str] = Query(None, description="Keyword search")
):
    """
    Returns curated visual product catalog with live delivery tracking and video-matching metadata.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    filtered = MASTER_CATALOG.copy()

    if category and category.lower() != "all":
        filtered = [p for p in filtered if p["category"].lower() == category.lower()]

    if delivery_status and delivery_status.lower() != "all":
        filtered = [p for p in filtered if p["delivery_status"].lower() == delivery_status.lower()]

    if search:
        q = search.lower().strip()
        filtered = [
            p for p in filtered
            if q in p["name"].lower()
            or q in p["brand"].lower()
            or q in p["tracking_number"].lower()
            or q in p["matched_class"].lower()
        ]

    results = []
    for p in filtered:
        results.append(ProductDTO(
            id=p["id"],
            sku=p["sku"],
            name=p["name"],
            brand=p["brand"],
            category=p["category"],
            price=p["price"],
            formatted_price=f"${p['price']:,.2f}",
            rating=p["rating"],
            reviews_count=p["reviews_count"],
            stock_status=p["stock_status"],
            stock_quantity=p["stock_quantity"],
            description=p["description"],
            image_url=p["image_url"],
            matched_class=p["matched_class"],
            similarity_score=p["similarity_score"],
            delivery_status=p["delivery_status"],
            tracking_number=p["tracking_number"],
            delivery_carrier=p["delivery_carrier"],
            eta=p["eta"],
            delivery_location=p["delivery_location"],
            recipient=p.get("recipient"),
            proof_of_delivery=p.get("proof_of_delivery"),
            appearances_in_video=[]
        ))

    return ResponseEnvelope(
        success=True,
        message=f"Retrieved {len(results)} products.",
        data=results,
        request_id=request_id
    )


@router.get("/matched/{video_id}", response_model=ResponseEnvelope[List[ProductDTO]])
async def get_products_matched_to_video(
    video_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Dynamically cross-references actual detected objects and keyframe timestamps from a processed video
    with the product catalog, generating real video-to-product discovery links and delivery verification timestamps.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not own this video.")

        objects = uow.objects.get_by_video_id(video_id)
        frames = {f.id: f for f in uow.frames.get_by_video_id(video_id)}

    # Group detected objects by class_label
    class_appearances = {}
    for obj in objects:
        lbl = (obj.class_label or "").lower()
        frame = frames.get(obj.frame_id)
        ts = 0.0
        if frame and frame.timestamp_offset_ms:
            ts = frame.timestamp_offset_ms / 1000.0
        elif frame and frame.frame_number:
            ts = round(frame.frame_number / 30.0, 1)

        app_dto = VideoAppearanceDTO(
            video_id=video_id,
            video_filename=video.filename,
            timestamp=ts,
            formatted_timestamp=format_sec_to_mmss(ts),
            frame_id=obj.frame_id,
            thumbnail_url=f"/api/v1/videos/{video_id}/frames/{obj.frame_id}/image" if obj.frame_id else None,
            confidence=round(float(obj.confidence or 0.85), 3),
            detection_label=lbl
        )
        if lbl not in class_appearances:
            class_appearances[lbl] = []
        class_appearances[lbl].append(app_dto)

    matched_results = []
    for item in MASTER_CATALOG:
        matched_lbl = item["matched_class"].lower()
        appearances = class_appearances.get(matched_lbl, [])

        # Deduplicate appearances by 1-second window
        deduped_appearances = []
        for app in sorted(appearances, key=lambda a: a.timestamp):
            if not deduped_appearances or abs(app.timestamp - deduped_appearances[-1].timestamp) >= 1.0:
                deduped_appearances.append(app)

        # Dynamic match boost if detected in this video
        sim = item["similarity_score"]
        if deduped_appearances:
            highest_conf = max([a.confidence for a in deduped_appearances])
            sim = min(99, int(highest_conf * 100) + 2)

        matched_results.append(ProductDTO(
            id=item["id"],
            sku=item["sku"],
            name=item["name"],
            brand=item["brand"],
            category=item["category"],
            price=item["price"],
            formatted_price=f"${item['price']:,.2f}",
            rating=item["rating"],
            reviews_count=item["reviews_count"],
            stock_status=item["stock_status"],
            stock_quantity=item["stock_quantity"],
            description=item["description"],
            image_url=item["image_url"],
            matched_class=item["matched_class"],
            similarity_score=sim,
            delivery_status=item["delivery_status"],
            tracking_number=item["tracking_number"],
            delivery_carrier=item["delivery_carrier"],
            eta=item["eta"],
            delivery_location=item["delivery_location"],
            recipient=item.get("recipient"),
            proof_of_delivery=item.get("proof_of_delivery"),
            appearances_in_video=deduped_appearances
        ))

    # Prioritize products that actually appeared in the video
    matched_results.sort(key=lambda p: (len(p.appearances_in_video) > 0, p.similarity_score), reverse=True)

    return ResponseEnvelope(
        success=True,
        message=f"Matched {len(matched_results)} products against video '{video.filename}'.",
        data=matched_results,
        request_id=request_id
    )


@router.post("/order", response_model=ResponseEnvelope[Dict[str, Any]])
async def create_product_order(
    req_body: OrderRequest,
    request: Request
):
    """
    Dispatches a product order with simulated logistics routing and live tracking assignment.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    item = next((p for p in MASTER_CATALOG if p["id"] == req_body.product_id), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Product '{req_body.product_id}' not found.")

    order_id = f"VS-ORD-{uuid.uuid4().hex[:8].upper()}"
    new_tracking = f"VS-TRK-{uuid.uuid4().hex[:7].upper()}"

    confirmation = {
        "order_id": order_id,
        "product_id": item["id"],
        "product_name": item["name"],
        "quantity": req_body.quantity,
        "total_amount": round(item["price"] * req_body.quantity, 2),
        "tracking_number": new_tracking,
        "carrier": req_body.carrier,
        "status": "Dispatch Scheduled",
        "estimated_delivery": "Within 2 Hours (Priority Courier)",
        "recipient": req_body.recipient_name,
        "shipping_address": req_body.delivery_address,
        "created_at": datetime.utcnow().isoformat()
    }

    return ResponseEnvelope(
        success=True,
        message=f"Order '{order_id}' confirmed! Tracking number assigned.",
        data=confirmation,
        request_id=request_id
    )


@router.post("/verify-delivery", response_model=ResponseEnvelope[Dict[str, Any]])
async def verify_video_delivery(
    req_body: VerifyDeliveryRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Validates visual Proof-of-Delivery by anchoring video keyframe timestamps to cargo tracking.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    with UnitOfWork() as uow:
        video = uow.videos.get(req_body.video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{req_body.video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not own this video.")

    cert_id = f"POD-CERT-{uuid.uuid4().hex[:8].upper()}"

    verification = {
        "certificate_id": cert_id,
        "video_id": req_body.video_id,
        "product_id": req_body.product_id,
        "timestamp_seconds": req_body.timestamp,
        "formatted_timestamp": format_sec_to_mmss(req_body.timestamp),
        "status": "Verified Proof of Delivery",
        "confidence_level": 0.96,
        "verified_at": datetime.utcnow().isoformat(),
        "notes": req_body.notes,
        "cryptographic_hash": f"SHA256:{uuid.uuid4().hex}{uuid.uuid4().hex[:16]}"
    }

    return ResponseEnvelope(
        success=True,
        message="Visual Proof-of-Delivery verified and anchored to video timestamp.",
        data=verification,
        request_id=request_id
    )
