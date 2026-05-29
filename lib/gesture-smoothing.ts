import { GestureType, GESTURE_THRESHOLDS } from "./gesture-config";

export class GestureSmoother {
  private buffer: GestureType[] = [];
  private currentStabilized: GestureType = "Unknown";
  private currentConfidence: number = 0;
  
  private heldGesture: GestureType = "Unknown";
  private holdStartTime: number | null = null;
  private lastTriggered: GestureType = "Unknown";

  public process(rawGesture: GestureType, timestamp: number): {
    stabilized: GestureType;
    confidence: number;
    triggered: GestureType;
  } {
    // 1. Update sliding window buffer
    this.buffer.push(rawGesture);
    if (this.buffer.length > GESTURE_THRESHOLDS.BUFFER_SIZE) {
      this.buffer.shift();
    }

    // 2. Find most frequent gesture in buffer (Majority voting)
    const counts: Record<string, number> = {};
    let maxCount = 0;
    let majorityGesture: GestureType = "Unknown";

    for (const g of this.buffer) {
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] > maxCount) {
        maxCount = counts[g];
        majorityGesture = g;
      }
    }

    this.currentStabilized = majorityGesture;
    // Calculate confidence based on occurrence in window
    this.currentConfidence = Math.round((maxCount / this.buffer.length) * 100);

    // 3. Hold detection
    if (this.currentStabilized !== "Unknown") {
      if (this.heldGesture !== this.currentStabilized) {
        // Started holding a new gesture
        this.heldGesture = this.currentStabilized;
        this.holdStartTime = timestamp;
      } else if (this.holdStartTime !== null && (timestamp - this.holdStartTime) >= GESTURE_THRESHOLDS.HOLD_DELAY_MS) {
        // Held long enough to trigger
        this.lastTriggered = this.heldGesture;
      }
    } else {
      // If we are at Unknown, reset hold
      this.heldGesture = "Unknown";
      this.holdStartTime = null;
      this.lastTriggered = "Unknown";
    }

    return {
      stabilized: this.currentStabilized,
      confidence: this.currentConfidence,
      triggered: this.lastTriggered
    };
  }

  public reset() {
    this.buffer = [];
    this.currentStabilized = "Unknown";
    this.currentConfidence = 0;
    this.heldGesture = "Unknown";
    this.holdStartTime = null;
    this.lastTriggered = "Unknown";
  }
}
