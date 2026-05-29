import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class EnergyBeam extends BaseScene {
  private beam!: THREE.Mesh;
  private glow!: THREE.Mesh;

  protected onInit(): void {
    const geo = new THREE.CylinderGeometry(0.1, 0.1, 5, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    this.beam = new THREE.Mesh(geo, mat);
    this.beam.rotation.z = Math.PI / 2;
    this.group.add(this.beam);

    const glowGeo = new THREE.CylinderGeometry(0.3, 0.3, 5, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x0055ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.glow.rotation.z = Math.PI / 2;
    this.group.add(this.glow);
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    const intensity = 1 + audioState.amplitude * 5;
    const length = handState.hands.length >= 2 ? 5 + handState.distance * 10 : 5;
    
    this.beam.scale.set(intensity, length / 5, intensity);
    this.glow.scale.set(intensity * 1.5, length / 5, intensity * 1.5);
    
    this.beam.rotation.x += delta * 10;
  }
}
