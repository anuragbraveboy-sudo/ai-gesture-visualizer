import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class NeonCathedral extends BaseScene {
  private grid!: THREE.GridHelper;
  private buildings: THREE.Mesh[] = [];

  protected onInit(): void {
    this.grid = new THREE.GridHelper(50, 50, 0x00ffff, 0x003333);
    this.grid.position.y = -2;
    this.group.add(this.grid);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });

    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 2,
        (Math.random() - 0.5) * 20
      );
      mesh.scale.set(1, Math.random() * 5 + 1, 1);
      this.group.add(mesh);
      this.buildings.push(mesh);
    }
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    // Distance intensity (closer = stronger)
    const distIntensity = handState.hands.length >= 2 ? Math.max(0, 1 - handState.distance * 2) : 0;
    const intensity = 1 + audioState.amplitude * 5 + distIntensity * 2;
    
    this.group.rotation.y = time * 0.1 * intensity;
    
    if (handState.hands.length > 0) {
      const hand = handState.hands[0];
      const scale = 1 + (hand.confidence / 100) * 0.5 * intensity;
      this.grid.scale.set(scale, scale, scale);
    }
  }
}
