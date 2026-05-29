import * as THREE from 'three';
import { MultiHandState, AudioState } from '../engine/EngineInterfaces';

export abstract class BaseScene {
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected renderer: THREE.WebGLRenderer;
  public group: THREE.Group; 

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(); 
    this.renderer = new THREE.WebGLRenderer(); 
    this.group = new THREE.Group();
  }

  public init(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.scene.add(this.group);
    this.onInit();
  }

  protected abstract onInit(): void;

  public abstract update(time: number, delta: number, handState: MultiHandState, audioState: AudioState): void;

  public onTransitionIn(): void {
    this.group.visible = true;
  }

  public onTransitionOut(): void {
    this.group.visible = false;
  }

  public dispose(): void {
    this.scene.remove(this.group);
    
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }
}
