import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export class PortalScene extends BaseScene {
  private portal!: THREE.Mesh;

  protected onInit(): void {
    const geo = new THREE.RingGeometry(1, 2, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9900ff, side: THREE.DoubleSide, wireframe: true });
    this.portal = new THREE.Mesh(geo, mat);
    this.group.add(this.portal);
  }

  public update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void {
    this.portal.rotation.z += delta * 2 * (1 + audioState.amplitude * 5);
    
    if (handState.hands.length >= 2) {
      const scale = 1 + handState.distance * 3;
      this.portal.scale.set(scale, scale, scale);
    }
  }
}
