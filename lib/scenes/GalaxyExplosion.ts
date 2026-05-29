import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class GalaxyExplosion extends BaseScene {
  private particles!: THREE.Points;
  private count = 3000;
  private velocities: number[] = [];
  private positions: Float32Array = new Float32Array();

  protected onInit(): void {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count * 3; i++) {
      this.positions[i] = (Math.random() - 0.5) * 2;
      this.velocities.push(Math.random() * 0.05);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    
    const mat = new THREE.PointsMaterial({ color: 0xff3300, size: 0.1, blending: THREE.AdditiveBlending, transparent: true });
    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    const posAttribute = this.particles.geometry.getAttribute('position');
    const positions = posAttribute.array as Float32Array;
    
    const explosionFactor = 1 + audioState.amplitude * 10 + (handState.hands.length >= 2 ? handState.distance * 2 : 0);

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] += (positions[i * 3] * this.velocities[i]) * explosionFactor * delta * 10;
      positions[i * 3 + 1] += (positions[i * 3 + 1] * this.velocities[i]) * explosionFactor * delta * 10;
      positions[i * 3 + 2] += (positions[i * 3 + 2] * this.velocities[i]) * explosionFactor * delta * 10;

      // Reset if too far
      if (Math.abs(positions[i * 3]) > 10 || Math.abs(positions[i * 3 + 1]) > 10 || Math.abs(positions[i * 3 + 2]) > 10) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
    }
    posAttribute.needsUpdate = true;
    this.particles.rotation.y += delta * 0.5;
  }
}
