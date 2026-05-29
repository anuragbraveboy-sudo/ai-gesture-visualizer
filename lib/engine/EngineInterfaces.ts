import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { GestureType } from "../gesture-config";

export interface GestureData {
  raw: GestureType;
  stabilized: GestureType;
  confidence: number;
  triggered: GestureType;
  landmarks: NormalizedLandmark[];
}

export interface MultiHandState {
  hands: GestureData[];
  distance: number; 
}

export interface AudioState {
  amplitude: number;
  frequencyData: Uint8Array | null;
}

export interface ScenePlugin {
  name: string;
  TriggerGesture: GestureType;
  TriggerGesture2?: GestureType; // If set, requires two hands
  SceneClass: any; 
}
