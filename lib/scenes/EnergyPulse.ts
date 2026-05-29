import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class EnergyPulse extends BaseScene {
  private rings: THREE.Mesh[] = [];

  protected onInit(): void {
    const geo = new THREE.TorusGeometry(1, 0.05, 16, 100);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
    
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      this.group.add(mesh);
      this.rings.push(mesh);
    }
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    const distIntensity = handState.hands.length >= 2 ? Math.max(0, 1 - handState.distance * 2) : 0;
    const intensity = 1 + audioState.amplitude * 4 + distIntensity;

    this.rings.forEach((ring, idx) => {
      const scale = (1 + ((time * 2 * intensity + idx) % 3));
      ring.scale.set(scale, scale, scale);
      (ring.material as THREE.MeshBasicMaterial).opacity = 1 - (scale / 4);
      ring.rotation.x = time * (0.5 + idx * 0.2) * intensity;
      ring.rotation.y = time * (0.3 + idx * 0.1) * intensity;
    });
  }
}
