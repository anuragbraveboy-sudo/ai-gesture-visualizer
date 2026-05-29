import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { GESTURE_THRESHOLDS, GestureType } from "./gesture-config";

// Calculate 3D distance between two landmarks
function getDistance(lm1: NormalizedLandmark, lm2: NormalizedLandmark): number {
  return Math.sqrt(
    Math.pow(lm1.x - lm2.x, 2) +
    Math.pow(lm1.y - lm2.y, 2) +
    Math.pow(lm1.z - lm2.z, 2)
  );
}

export function detectGesture(landmarks: NormalizedLandmark[]): GestureType {
  if (!landmarks || landmarks.length !== 21) return "Unknown";

  const wrist = landmarks[0];
  
  // Finger landmarks: [MCP, PIP, DIP, TIP]
  const thumb = { cmc: landmarks[1], mcp: landmarks[2], ip: landmarks[3], tip: landmarks[4] };
  const index = { mcp: landmarks[5], pip: landmarks[6], dip: landmarks[7], tip: landmarks[8] };
  const middle = { mcp: landmarks[9], pip: landmarks[10], dip: landmarks[11], tip: landmarks[12] };
  const ring = { mcp: landmarks[13], pip: landmarks[14], dip: landmarks[15], tip: landmarks[16] };
  const pinky = { mcp: landmarks[17], pip: landmarks[18], dip: landmarks[19], tip: landmarks[20] };

  // Helper to check if a finger (index to pinky) is extended
  const isExtended = (finger: typeof index) => {
    const tipDist = getDistance(wrist, finger.tip);
    const pipDist = getDistance(wrist, finger.pip);
    // When finger is straight, tip is further from wrist than pip
    return tipDist > pipDist * GESTURE_THRESHOLDS.FINGER_EXTENSION_RATIO;
  };

  const isIndexExt = isExtended(index);
  const isMiddleExt = isExtended(middle);
  const isRingExt = isExtended(ring);
  const isPinkyExt = isExtended(pinky);

  // Thumb logic: compare tip distance to pinky base vs palm width
  const palmWidth = getDistance(index.mcp, pinky.mcp);
  const thumbToPinkyBase = getDistance(thumb.tip, pinky.mcp);
  const isThumbExt = thumbToPinkyBase > palmWidth * GESTURE_THRESHOLDS.THUMB_EXTENSION_RATIO;
  
  // Check if thumb points UP (Y is inverted on screen, so lower Y is "up")
  // Meaning thumb tip Y should be considerably smaller than thumb mcp Y
  const isThumbPointingUp = thumb.mcp.y - thumb.tip.y > GESTURE_THRESHOLDS.THUMB_UP_Y_THRESHOLD;

  // 1. Open Palm
  if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt && isThumbExt) {
    return "Open Palm";
  }

  // 2. Closed Fist
  if (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt && !isThumbExt) {
    return "Closed Fist";
  }

  // 3. Peace Sign
  if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
    return "Peace Sign";
  }

  // 4. Thumbs Up
  if (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt && isThumbExt && isThumbPointingUp) {
    return "Thumbs Up";
  }

  // 5. Pointing Index
  if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt && !isThumbExt) {
    return "Pointing Index Finger";
  }

  return "Unknown";
}
