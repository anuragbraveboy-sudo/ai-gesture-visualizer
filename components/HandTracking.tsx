"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";

export default function HandTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
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
  const predict = () => {
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
            setLandmarks(results.landmarks[0]);
            drawLandmarks(ctx, results.landmarks[0], canvas.width, canvas.height);
          } else {
            setLandmarks(null);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number) => {
    const connections = HandLandmarker.HAND_CONNECTIONS;
    
    // Draw connections
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

    // Draw landmarks
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

        <div className="relative rounded-lg overflow-hidden border border-neutral-700 bg-black aspect-video w-full max-w-4xl">
          <video 
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100"
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 z-10"
          />
        </div>
      </div>

      <div className="w-full lg:w-80 bg-neutral-800 rounded-lg p-4 overflow-y-auto border border-neutral-700 flex flex-col">
        <h2 className="text-xl font-semibold mb-4 border-b border-neutral-700 pb-2">Coordinates</h2>
        {landmarks ? (
          <div className="space-y-1 text-xs font-mono">
            {landmarks.map((lm, idx) => (
              <div key={idx} className="flex justify-between hover:bg-neutral-700 p-1 rounded">
                <span className="text-neutral-400 w-6">[{idx}]</span>
                <span className="text-red-400">X: {lm.x.toFixed(3)}</span>
                <span className="text-green-400">Y: {lm.y.toFixed(3)}</span>
                <span className="text-blue-400">Z: {lm.z.toFixed(3)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-neutral-400 flex-1 flex items-center justify-center">
            No hand detected
          </div>
        )}
      </div>
    </div>
  );
}
