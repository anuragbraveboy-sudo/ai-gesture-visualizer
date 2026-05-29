/**
 * Configuration and Thresholds for Gesture Recognition
 */

export const GESTURE_THRESHOLDS = {
  // A finger is considered extended if the distance from Wrist to Tip 
  // is greater than Wrist to PIP * this multiplier.
  // Because Fingers bend at PIP, if extended, the Tip is much further away.
  FINGER_EXTENSION_RATIO: 1.2,
  
  // Thumb is considered extended if the distance from Thumb Tip to Pinky Base (MCP)
  // is greater than this threshold relative to the palm width.
  THUMB_EXTENSION_RATIO: 1.4,
  
  // To ensure thumbs up, the Thumb Tip Y should be significantly higher (lower Y value)
  // than the Thumb MCP joints.
  THUMB_UP_Y_THRESHOLD: 0.1,
  
  // Minimum time a gesture must be consistently recognized to be "held" and triggered
  HOLD_DELAY_MS: 300,
  
  // Number of frames in the sliding window buffer for smoothing
  BUFFER_SIZE: 10,
};

export type GestureType = "Open Palm" | "Closed Fist" | "Peace Sign" | "Thumbs Up" | "Pointing Index Finger" | "Unknown";

/**
 * Classification Rules Documentation:
 * 
 * 1. Open Palm: Index, Middle, Ring, Pinky, and Thumb are all EXTENDED.
 * 2. Closed Fist: Index, Middle, Ring, Pinky, and Thumb are all FOLDED.
 * 3. Peace Sign: Index and Middle are EXTENDED. Ring and Pinky are FOLDED.
 * 4. Thumbs Up: Thumb is EXTENDED and pointing upwards. All other fingers FOLDED.
 * 5. Pointing Index Finger: Index is EXTENDED. Middle, Ring, Pinky are FOLDED.
 */
