/**
 * Classifier Service
 * 
 * Handles communication with the YOLOv6 detection backend.
 * Sends images to the /detect endpoint and processes detection results.
 * 
 * The backend model detects: banana, bottle, and syringes
 * Returns bounding boxes, labels, confidence scores, and waste type classification.
 */

const API_URL = import.meta.env.VITE_CLASSIFIER_API_URL ?? "http://127.0.0.1:8000";

export type WasteType = "biodegradable" | "non-biodegradable";

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface ClassifierResponse {
  topPrediction: {
    label: string;
    confidence: number;
    wasteType: WasteType;
  } | null;
  detections: Detection[];
}

interface RawBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RawDetection {
  label: string;
  confidence: number;
  bounding_box: RawBoundingBox;
}

interface RawResponse {
  success: boolean;
  top_prediction: {
    label: string;
    confidence: number;
    waste_type: WasteType;
  } | null;
  detections: RawDetection[];
}

const toDetection = (raw: RawDetection): Detection => ({
  label: raw.label,
  confidence: raw.confidence,
  boundingBox: {
    x1: raw.bounding_box?.x1 ?? 0,
    y1: raw.bounding_box?.y1 ?? 0,
    x2: raw.bounding_box?.x2 ?? 0,
    y2: raw.bounding_box?.y2 ?? 0,
  },
});

export const classifyImage = async (image: Blob): Promise<ClassifierResponse> => {
  // Prepare image for upload to YOLOv6 backend
  const formData = new FormData();
  formData.append("file", image, "frame.jpg");

  // Send POST request to /detect endpoint
  const response = await fetch(`${API_URL}/detect`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Classifier request failed with status ${response.status}`);
  }

  const data = (await response.json()) as RawResponse;

  if (!data.success) {
    throw new Error("Classifier response did not succeed");
  }

  // Transform backend response to frontend format
  const detections = (data.detections ?? []).map(toDetection);
  const topPrediction = data.top_prediction
    ? {
        label: data.top_prediction.label,
        confidence: data.top_prediction.confidence,
        wasteType: data.top_prediction.waste_type,
      }
    : null;

  return { topPrediction, detections };
};
