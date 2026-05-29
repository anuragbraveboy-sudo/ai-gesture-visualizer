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
}

export interface ScenePlugin {
  name: string;
  TriggerGesture: GestureType;
  SceneClass: any; // Class implementing BaseScene
}
