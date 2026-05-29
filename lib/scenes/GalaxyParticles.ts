import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class GalaxyParticles extends BaseScene {
  private particles!: THREE.Points;
  private count = 2000;

  protected onInit(): void {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    const mat = new THREE.PointsMaterial({ color: 0xffcc00, size: 0.05, blending: THREE.AdditiveBlending, transparent: true });
    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    const distIntensity = handState.hands.length >= 2 ? Math.max(0, 1 - handState.distance * 2) : 0;
    const intensity = 1 + audioState.amplitude * 3 + distIntensity;

    this.particles.rotation.y = time * 0.2 * intensity;
    this.particles.rotation.x = time * 0.1 * intensity;

    if (handState.hands.length > 0) {
      this.particles.rotation.y += handState.hands[0].confidence * 0.0005 * intensity;
    }
  }
}
