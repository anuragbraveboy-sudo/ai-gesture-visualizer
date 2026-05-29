"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { detectGesture } from "../lib/gesture-recognition";
import { GestureSmoother } from "../lib/gesture-smoothing";
import { SceneManager } from "../lib/engine/SceneManager";
import { MultiHandState, GestureData } from "../lib/engine/EngineInterfaces";
import { ExportEngine } from "../lib/features/ExportEngine";

export default function HandTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediapipeCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handState, setHandState] = useState<MultiHandState>({ hands: [] });
  const [activeSceneName, setActiveSceneName] = useState<string>("None");
  
  // Smoothers for up to 2 hands
  const smoothersRef = useRef([new GestureSmoother(), new GestureSmoother()]);
  
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
          numHands: 2, // Multi-Hand Support
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
    
    return () => { 
      active = false; 
    };
  }, []);

  // Initialize Three.js SceneManager
  useEffect(() => {
    if (threeCanvasRef.current) {
      sceneManagerRef.current = new SceneManager(
        threeCanvasRef.current, 
        threeCanvasRef.current.clientWidth, 
        threeCanvasRef.current.clientHeight
      );
      
      sceneManagerRef.current.onSceneChange = (name) => {
        setActiveSceneName(name);
      };

      const handleResize = () => {
        if (sceneManagerRef.current && threeCanvasRef.current) {
          sceneManagerRef.current.resize(
            threeCanvasRef.current.clientWidth,
            threeCanvasRef.current.clientHeight
          );
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (sceneManagerRef.current) {
          sceneManagerRef.current.dispose();
          sceneManagerRef.current = null;
        }
      };
    }
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
    if (videoRef.current && mediapipeCanvasRef.current && handLandmarkerRef.current) {
      const video = videoRef.current;
      const canvas = mediapipeCanvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const newHandsState: GestureData[] = [];
          
          if (results.landmarks && results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
              if (i >= smoothersRef.current.length) break; // Limit to smoothers max
              
              const currentLandmarks = results.landmarks[i];
              drawLandmarks(ctx, currentLandmarks, canvas.width, canvas.height);
              
              const raw = detectGesture(currentLandmarks);
              const smoothed = smoothersRef.current[i].process(raw, timestamp);
              
              newHandsState.push({
                raw: raw,
                stabilized: smoothed.stabilized,
                confidence: smoothed.confidence,
                triggered: smoothed.triggered,
                landmarks: currentLandmarks
              });
            }
          } else {
            // Reset smoothers if no hands
            smoothersRef.current.forEach(s => s.reset());
          }
          
          const nextState = { hands: newHandsState };
          setHandState(nextState);
          
          // Feed to scene engine
          if (sceneManagerRef.current) {
            sceneManagerRef.current.updateHandState(nextState);
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

  const handleScreenshot = () => {
    if (sceneManagerRef.current) {
      ExportEngine.captureScreenshot(sceneManagerRef.current.getCanvas());
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
      {/* Viewport Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flex justify-between items-center w-full mb-4">
          <h1 className="text-2xl font-bold">AI Visualizer - Phase 3</h1>
          <button 
            onClick={handleScreenshot}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold transition-colors"
          >
            📸 Export Frame
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-4 w-full">
            {error}
          </div>
        )}

        {!isLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 rounded-lg">
            <div className="text-xl animate-pulse">Loading Engines...</div>
          </div>
        )}

        <div className="relative rounded-lg overflow-hidden border border-neutral-700 bg-black aspect-video w-full max-w-4xl shadow-2xl">
          {/* 1. Webcam Video Layer */}
          <video 
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 opacity-30"
            playsInline
          />
          {/* 2. MediaPipe Debug Layer */}
          <canvas
            ref={mediapipeCanvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 z-10 opacity-30 pointer-events-none"
          />
          {/* 3. Three.js Engine Layer */}
          <canvas
            ref={threeCanvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover z-20 pointer-events-none"
          />
          
          {/* Active Scene Indicator */}
          {activeSceneName !== "None" && (
            <div className="absolute top-4 left-4 z-30 bg-purple-900/80 backdrop-blur-sm px-6 py-3 rounded shadow-lg border border-purple-400 flex items-center gap-3 transition-all">
              <span className="font-bold text-lg drop-shadow-md">Scene: {activeSceneName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Multi-Hand Debug Panel */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 shadow-lg flex-1 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-3 border-b border-neutral-700 pb-2 text-indigo-400">Hand States</h2>
          
          {handState.hands.length > 0 ? (
            <div className="space-y-4">
              {handState.hands.map((hand, idx) => (
                <div key={idx} className="bg-neutral-900 p-3 rounded border border-neutral-700">
                  <h3 className="font-bold text-sm text-neutral-300 mb-2 border-b border-neutral-800 pb-1">Hand {idx + 1}</h3>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">Triggered:</span>
                      <span className={hand.triggered !== "Unknown" ? "text-green-400 font-bold" : "text-neutral-500"}>
                        {hand.triggered}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-neutral-400">Stabilized:</span>
                      <span className={hand.stabilized !== "Unknown" ? "text-blue-400" : "text-neutral-500"}>
                        {hand.stabilized}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-neutral-400">Confidence:</span>
                      <span className="text-yellow-400">{hand.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 h-full flex items-center justify-center italic text-sm py-10">
              No hands detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
