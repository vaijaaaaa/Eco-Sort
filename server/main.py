"""
FastAPI service exposing YOLO-based waste classification.

This backend provides object detection using a trained YOLOv6 model that can identify:
- banana (biodegradable)
- bottle (non-biodegradable)
- syringes (non-biodegradable)

The model is loaded from: yolov6/runs/detect/train/weights/best.pt

API Endpoints:
- GET /health: Health check to verify model is loaded
- POST /detect: Upload an image and receive detection results with bounding boxes

Detection results include:
- Bounding boxes (x1, y1, x2, y2 coordinates)
- Class labels (banana, bottle, syringes)
- Confidence scores (0-1 range)
- Waste type classification (biodegradable/non-biodegradable)
"""
"""FastAPI service exposing YOLO-based waste classification."""
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Dict, List, Literal, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
# Updated to use the new trained YOLOv6 model
DEFAULT_MODEL_PATH = BASE_DIR.parent / "yolov6" / "runs" / "detect" / "train" / "weights" / "best.pt"
DEFAULT_MODEL_PATH = BASE_DIR.parent / "yolov8" / "runs" / "detect" / "train3" / "weights" / "best.pt"
DEFAULT_WASTE_TYPE = "non-biodegradable"

app = FastAPI(title="Waste Classifier API")

model: Optional[YOLO] = None
confidence_threshold = float(os.getenv("MIN_CONFIDENCE", "0.25"))
weights_path = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))).resolve()

# Updated waste type mapping for the new YOLOv6 model classes: banana, bottle, syringes
waste_type_map: Dict[str, Literal["biodegradable", "non-biodegradable"]] = {
    "banana": "biodegradable",
    "bottle": "non-biodegradable",
    "syringes": "non-biodegradable",
    # Legacy mappings for backwards compatibility
waste_type_map: Dict[str, Literal["biodegradable", "non-biodegradable"]] = {
    "bottle": "non-biodegradable",
    "carrybag": "non-biodegradable",
    "carry_bag": "non-biodegradable",
}

origins_env = os.getenv("ALLOWED_ORIGINS", "")
if origins_env.strip():
    allowed_origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    label: str
    confidence: float
    bounding_box: BoundingBox


class TopPrediction(BaseModel):
    label: str
    confidence: float
    waste_type: Literal["biodegradable", "non-biodegradable"]


class DetectResponse(BaseModel):
    success: bool
    top_prediction: Optional[TopPrediction]
    detections: List[Detection]


@app.on_event("startup")
def load_model() -> None:
    """
    Load the YOLOv6 trained model on application startup.
    
    The model is loaded from the weights path specified in the environment variable
    MODEL_PATH, or defaults to the trained YOLOv6 model at:
    yolov6/runs/detect/train/weights/best.pt
    
    This model is trained to detect: banana, bottle, and syringes
    """
    if not weights_path.exists():
        raise RuntimeError(f"Model weights not found at {weights_path}")
    global model
    model = YOLO(str(weights_path))
    print(f"✓ YOLOv6 model loaded successfully from {weights_path}")
    print(f"✓ Model classes: {model.names}")


@app.get("/health")
def health() -> Dict[str, str]:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ok"}


@app.post("/detect", response_model=DetectResponse)
async def detect(file: UploadFile = File(...)) -> DetectResponse:
    """
    Perform object detection on an uploaded image using the trained YOLOv6 model.
    
    This endpoint:
    1. Accepts an image file via multipart/form-data
    2. Runs YOLOv6 detection with confidence threshold
    3. Returns bounding boxes, class labels, and confidence scores
    4. Maps detected classes to biodegradable/non-biodegradable waste types
    
    Args:
        file: Uploaded image file (JPEG, PNG, etc.)
    
    Returns:
        DetectResponse containing:
        - success: Boolean indicating detection status
        - top_prediction: Highest confidence detection with waste type classification
        - detections: List of all detected objects with bounding boxes
    
    Raises:
        HTTPException: If model is not ready, file is empty/invalid, or inference fails
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not ready")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not parse image") from exc

    try:
        # Run YOLOv6 detection with configured confidence threshold
        results = model.predict(image, conf=confidence_threshold, verbose=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Inference failed") from exc

    detections: List[Detection] = []

    # Parse detection results and extract bounding boxes
    for result in results:
        if not hasattr(result, "boxes") or result.boxes is None:
            continue
        for box in result.boxes:
            cls_id = int(box.cls[0])
            label = model.names.get(cls_id, f"class_{cls_id}")
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
            detections.append(
                Detection(
                    label=label,
                    confidence=confidence,
                    bounding_box=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2),
                )
            )

    # Find the highest confidence detection and classify waste type
    top_prediction: Optional[TopPrediction] = None
    if detections:
        best_detection = max(detections, key=lambda detection: detection.confidence)
        mapped_type = waste_type_map.get(best_detection.label.lower(), DEFAULT_WASTE_TYPE)
        top_prediction = TopPrediction(
            label=best_detection.label,
            confidence=best_detection.confidence,
            waste_type=mapped_type,
        )

    return DetectResponse(success=True, top_prediction=top_prediction, detections=detections)
