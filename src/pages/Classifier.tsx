import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Camera, Leaf, Trash2, StopCircle, History } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import {
  classifyImage,
  type ClassifierResponse,
  type WasteType,
} from "@/services/classifierService";

const DETECTION_INTERVAL_MS = 1500;

const WASTE_TYPE_MAP: Record<string, WasteType> = {
  bottle: "non-biodegradable",
  carrybag: "non-biodegradable",
  "carry bag": "non-biodegradable",
  carry_bag: "non-biodegradable",
};

type Classification = {
  label: string;
  wasteType: WasteType;
  confidence: number;
  detections: ClassifierResponse["detections"];
  detectedAt: number;
};

type HistoryEntry = {
  id: string;
  label: string;
  wasteType: WasteType;
  confidence: number;
  detectedAt: number;
};

const formatLabel = (label: string) =>
  label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatConfidence = (value: number) => {
  const scaled = value > 1 ? value : value * 100;
  return Math.round(Math.min(scaled, 100));
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const getWasteType = (label: string): WasteType =>
  WASTE_TYPE_MAP[label.toLowerCase()] ?? "non-biodegradable";

const overlayColors: Record<WasteType, string> = {
  biodegradable: "#22c55e",
  "non-biodegradable": "#ef4444",
};

const Classifier = () => {
  const [classification, setClassification] = useState<Classification | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentDetections, setCurrentDetections] = useState<ClassifierResponse["detections"]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const detectionInFlightRef = useRef(false);
  const lastErrorRef = useRef(0);

  const { toast } = useToast();

  const stopSession = useCallback(() => {
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    detectionInFlightRef.current = false;
    setIsSessionActive(false);
    setIsDialogOpen(false);
    setCurrentDetections([]);

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleStartSession = async () => {
    if (isSessionActive) {
      setIsDialogOpen(true);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setIsSessionActive(true);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Camera access failed", error);
      toast({
        title: "Camera Error",
        description: "Unable to access the camera. Please check permissions and try again.",
        variant: "destructive",
      });
      stopSession();
    }
  };

  const runDetection = useCallback(async () => {
    if (!isSessionActive || detectionInFlightRef.current) {
      return;
    }

    const video = videoRef.current;
    const captureCanvas = captureCanvasRef.current;

    if (!video || !captureCanvas || !streamRef.current) {
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    const context = captureCanvas.getContext("2d");
    if (!context) {
      return;
    }

    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    detectionInFlightRef.current = true;

    try {
      const frameBlob = await new Promise<Blob>((resolve, reject) => {
        captureCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to capture frame"));
          }
        }, "image/jpeg", 0.9);
      });

      const result = await classifyImage(frameBlob);
      const detections = result.detections ?? [];
      setCurrentDetections(detections);

      if (result.topPrediction) {
        const detectedAt = Date.now();
        const { label, confidence, wasteType } = result.topPrediction;

        setClassification({
          label,
          confidence,
          wasteType,
          detections,
          detectedAt,
        });

        setHistory((prev) => {
          const entry: HistoryEntry = {
            id: `${detectedAt}-${label}`,
            label,
            wasteType,
            confidence,
            detectedAt,
          };

          const [latest] = prev;
          if (
            latest &&
            latest.label === entry.label &&
            Math.abs(latest.confidence - entry.confidence) < 1 &&
            detectedAt - latest.detectedAt < 5000
          ) {
            return prev;
          }

          return [entry, ...prev].slice(0, 20);
        });
      } else {
        setClassification(null);
      }
    } catch (error) {
      console.error("Detection failed", error);
      const now = Date.now();
      if (now - lastErrorRef.current > 4000) {
        toast({
          title: "Detection Error",
          description: error instanceof Error ? error.message : "Unable to analyse the current frame.",
          variant: "destructive",
        });
        lastErrorRef.current = now;
      }
    } finally {
      detectionInFlightRef.current = false;
    }
  }, [isSessionActive, toast]);

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    context.clearRect(0, 0, rect.width, rect.height);

    if (!isSessionActive) {
      return;
    }

    const videoWidth = video.videoWidth || rect.width;
    const videoHeight = video.videoHeight || rect.height;
    const scaleX = rect.width / videoWidth;
    const scaleY = rect.height / videoHeight;

    context.font = "16px 'Inter', sans-serif";
    context.textBaseline = "top";

    currentDetections.forEach((detection) => {
      const { x1, y1, x2, y2 } = detection.boundingBox;
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      const x = x1 * scaleX;
      const y = y1 * scaleY;

      const wasteType = getWasteType(detection.label);
      const color = overlayColors[wasteType];

      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);

      const label = `${formatLabel(detection.label)} (${formatConfidence(detection.confidence)}%)`;
      const textPadding = 4;
      const textWidth = context.measureText(label).width + textPadding * 2;
      const textHeight = 20;
      const textY = y - textHeight - 2 < 0 ? y + 2 : y - textHeight - 2;

      context.fillStyle = color;
      context.fillRect(x, textY, textWidth, textHeight);

      context.fillStyle = "#ffffff";
      context.fillText(label, x + textPadding, textY + 2);
    });
  }, [currentDetections, isSessionActive]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  useEffect(() => {
    if (isDialogOpen) {
      drawOverlay();
    }
  }, [isDialogOpen, drawOverlay]);

  useEffect(() => {
    window.addEventListener("resize", drawOverlay);
    return () => {
      window.removeEventListener("resize", drawOverlay);
    };
  }, [drawOverlay]);

  useEffect(() => {
    if (isSessionActive) {
      const executeDetection = () => {
        void runDetection();
      };

      detectionIntervalRef.current = window.setInterval(executeDetection, DETECTION_INTERVAL_MS);
      void runDetection();

      return () => {
        if (detectionIntervalRef.current) {
          window.clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      };
    }

    return undefined;
  }, [isSessionActive, runDetection]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isDialogOpen || !video || !stream) {
      return;
    }

    video.srcObject = stream;
    const playPromise = video.play();
    void playPromise?.catch(() => undefined);
  }, [isDialogOpen]);

  useEffect(() => () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Waste Classifier</h1>
          <p className="text-lg text-muted-foreground">
            Launch the live detector, keep the item in frame, and receive instant biodegradable insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Live Classification Session</h2>
              <p className="text-sm text-muted-foreground">
                We capture frames every few seconds, analyse them with the YOLOv8 model, and stream the results back to you.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-muted-foreground/40 p-6">
              {isSessionActive ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                    <span className="text-sm font-medium">Live detection running</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                      <Camera className="h-5 w-5" />
                      View Camera Feed
                    </Button>
                    <Button onClick={stopSession} variant="outline" className="gap-2">
                      <StopCircle className="h-5 w-5" />
                      End Session
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Close the feed or end the session to release the camera.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 items-start">
                  <Button onClick={handleStartSession} className="gap-2">
                    <Camera className="h-5 w-5" />
                    Start Live Classification
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    A pop-up will appear requesting camera access. Allow it to begin analysing frames in real time.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Latest Detection</h2>
              {classification ? (
                <Badge variant="outline">{formatTime(classification.detectedAt)}</Badge>
              ) : null}
            </div>

            {classification ? (
              <div className="space-y-6">
                <div className="p-6 bg-muted rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">{formatLabel(classification.label)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {formatConfidence(classification.confidence)}%
                      </p>
                    </div>
                    {classification.wasteType === "biodegradable" ? (
                      <Leaf className="h-8 w-8 text-primary" />
                    ) : (
                      <Trash2 className="h-8 w-8 text-destructive" />
                    )}
                  </div>

                  <Badge
                    variant={classification.wasteType === "biodegradable" ? "default" : "destructive"}
                    className="text-base px-4 py-1"
                  >
                    {classification.wasteType === "biodegradable" ? "Biodegradable" : "Non-Biodegradable"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Disposal Guidelines</h4>
                  {classification.wasteType === "biodegradable" ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Can be composted or added to organic waste bins.</li>
                      <li>• Decomposes naturally with minimal processing.</li>
                      <li>• Keep away from mixed recycling streams.</li>
                    </ul>
                  ) : (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Requires designated recycling or disposal facilities.</li>
                      <li>• Consider upcycling or reusing whenever possible.</li>
                      <li>• Avoid contaminating organic waste collections.</li>
                    </ul>
                  )}
                </div>

                {classification.detections.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Detected Objects</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {classification.detections.map((detection, index) => (
                        <li key={`${detection.label}-${index}`}>
                          {formatLabel(detection.label)} — {formatConfidence(detection.confidence)}%
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-12">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No detections yet. Start a live session to see results here in real time.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-12 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Classification History</h2>
          </div>
          <Separator />
          {history.length ? (
            <ScrollArea className="h-64 pr-2">
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
                    <div>
                      <p className="font-medium">{formatLabel(entry.label)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(entry.detectedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {formatConfidence(entry.confidence)}%
                      </span>
                      <Badge
                        variant={entry.wasteType === "biodegradable" ? "default" : "destructive"}
                      >
                        {entry.wasteType === "biodegradable" ? "Biodegradable" : "Non-Biodegradable"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Run a live session to build a detection trail.</p>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="p-6 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Biodegradable Waste</h3>
                <p className="text-sm text-muted-foreground">
                  Organic materials that decompose naturally. Examples include food scraps, paper, and plant matter.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Non-Biodegradable Waste</h3>
                <p className="text-sm text-muted-foreground">
                  Materials that don't decompose naturally. Includes plastics, metals, glass, and electronic waste.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && stopSession()}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Live Waste Detection</DialogTitle>
            <DialogDescription>
              Keep your item steady inside the frame. Bounding boxes refresh as the YOLO model identifies objects.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-contain"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {classification
                ? `Tracking ${formatLabel(classification.label)} with ${formatConfidence(classification.confidence)}% confidence.`
                : "Waiting for detections..."}
            </p>
            <Button onClick={stopSession} variant="outline" className="gap-2">
              <StopCircle className="h-5 w-5" />
              End Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <canvas ref={captureCanvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default Classifier;
