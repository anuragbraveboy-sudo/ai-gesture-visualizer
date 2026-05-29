import { GestureData, MultiHandState } from "./EngineInterfaces";

export class MultiHandInteractionEngine {
  public static process(hands: GestureData[]): MultiHandState {
    let distance = 0;
    
    if (hands.length >= 2) {
      const h1Wrist = hands[0].landmarks[0];
      const h2Wrist = hands[1].landmarks[0];
      
      distance = Math.sqrt(
        Math.pow(h1Wrist.x - h2Wrist.x, 2) +
        Math.pow(h1Wrist.y - h2Wrist.y, 2) +
        Math.pow(h1Wrist.z - h2Wrist.z, 2)
      );
    }
    
    return {
      hands,
      distance
    };
  }
}
