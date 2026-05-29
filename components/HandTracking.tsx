"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { detectGesture } from "../lib/gesture-recognition";
import { GestureSmoother } from "../lib/gesture-smoothing";
import { GestureType } from "../lib/gesture-config";

export default function HandTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  
  // Gesture State
  const smootherRef = useRef(new GestureSmoother());
  const [rawGesture, setRawGesture] = useState<GestureType>("Unknown");
  const [stabilizedGesture, setStabilizedGesture] = useState<GestureType>("Unknown");
  const [confidence, setConfidence] = useState<number>(0);
  const [triggeredGesture, setTriggeredGesture] = useState<GestureType>("Unknown");
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (!active) return;
        handLandmarkerRef.current = handLandmarker;
        setIsLoaded(true);
        startCamera();
      } catch (err: any) {
        if (active) setError("Failed to load MediaPipe: " + err.message);
      }
    }
    initMediaPipe();
    return () => { active = false; };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          requestRef.current = requestAnimationFrame(predict);
        };
      }
    } catch (err: any) {
      setError("Failed to access camera: " + err.message);
    }
  };

  let lastVideoTime = -1;
  const predict = (timestamp: number) => {
    if (videoRef.current && canvasRef.current && handLandmarkerRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (results.landmarks && results.landmarks.length > 0) {
            const currentLandmarks = results.landmarks[0];
            setLandmarks(currentLandmarks);
            drawLandmarks(ctx, currentLandmarks, canvas.width, canvas.height);
            
            // Gesture Recognition
            const raw = detectGesture(currentLandmarks);
            setRawGesture(raw);
            
            const smoothed = smootherRef.current.process(raw, timestamp);
            setStabilizedGesture(smoothed.stabilized);
            setConfidence(smoothed.confidence);
            setTriggeredGesture(smoothed.triggered);

          } else {
            setLandmarks(null);
            setRawGesture("Unknown");
            smootherRef.current.reset();
            setStabilizedGesture("Unknown");
            setConfidence(0);
            setTriggeredGesture("Unknown");
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number) => {
    const connections = HandLandmarker.HAND_CONNECTIONS;
    
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    for (const connection of connections) {
      const start = landmarks[connection.start];
      const end = landmarks[connection.end];
      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }

    ctx.fillStyle = "#FF0000";
    for (const landmark of landmarks) {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-screen p-4 gap-4 bg-neutral-900 text-white">
      {/* Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <h1 className="text-2xl font-bold mb-4">AI Gesture Visualizer</h1>
        
        {error && (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!isLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-lg">
            <div className="text-xl animate-pulse">Loading AI Models...</div>
          </div>
        )}

        {/* Primary Viewport */}
        <div className="relative rounded-lg overflow-hidden border border-neutral-700 bg-black aspect-video w-full max-w-4xl shadow-2xl">
          <video 
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100"
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 z-10"
          />
          
          {/* Active Gesture Overlay Indicator */}
          {triggeredGesture !== "Unknown" && (
            <div className="absolute top-4 left-4 z-20 bg-green-500/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-green-400 flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-bold text-xl drop-shadow-md">{triggeredGesture}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Debug Panel */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 shadow-lg">
          <h2 className="text-lg font-semibold mb-3 border-b border-neutral-700 pb-2 text-indigo-400">Debug Panel</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Raw Gesture:</span>
              <span className={rawGesture !== "Unknown" ? "text-yellow-400" : "text-neutral-500"}>
                {rawGesture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Stabilized:</span>
              <span className={stabilizedGesture !== "Unknown" ? "text-blue-400" : "text-neutral-500"}>
                {stabilizedGesture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Confidence:</span>
              <span className="text-green-400">{confidence}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Landmarks:</span>
              <span className="text-white">{landmarks ? landmarks.length : 0}</span>
            </div>
          </div>
          
          {/* Confidence Bar */}
          <div className="mt-4 h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300 ease-out"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Coordinates Panel */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 shadow-lg flex-1 overflow-y-auto min-h-[300px]">
          <h2 className="text-lg font-semibold mb-3 border-b border-neutral-700 pb-2 text-indigo-400">Coordinates</h2>
          {landmarks ? (
            <div className="space-y-1 text-xs font-mono">
              {landmarks.map((lm, idx) => (
                <div key={idx} className="flex justify-between hover:bg-neutral-700 p-1 rounded transition-colors">
                  <span className="text-neutral-400 w-6">[{idx}]</span>
                  <span className="text-red-400">X: {lm.x.toFixed(3)}</span>
                  <span className="text-green-400">Y: {lm.y.toFixed(3)}</span>
                  <span className="text-blue-400">Z: {lm.z.toFixed(3)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 h-full flex items-center justify-center italic text-sm py-10">
              Waiting for hand...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
