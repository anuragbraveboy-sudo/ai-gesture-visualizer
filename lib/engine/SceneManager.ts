import * as THREE from 'three';
import { BaseScene } from '../scenes/BaseScene';
import { MultiHandState, ScenePlugin } from './EngineInterfaces';

// Plugins
import { NeonCathedral } from '../scenes/NeonCathedral';
import { GalaxyParticles } from '../scenes/GalaxyParticles';
import { EnergyPulse } from '../scenes/EnergyPulse';

export const SCENE_PLUGINS: ScenePlugin[] = [
  { name: "Neon Cathedral", TriggerGesture: "Open Palm", SceneClass: NeonCathedral },
  { name: "Galaxy Particles", TriggerGesture: "Peace Sign", SceneClass: GalaxyParticles },
  { name: "Energy Pulse", TriggerGesture: "Thumbs Up", SceneClass: EnergyPulse },
];

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentSceneObj: BaseScene | null = null;
  private currentPlugin: ScenePlugin | null = null;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private handState: MultiHandState = { hands: [] };
  
  public onSceneChange?: (sceneName: string) => void;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true }); // preserveDrawingBuffer for Export
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.clock = new THREE.Clock();
    
    this.renderLoop = this.renderLoop.bind(this);
    this.animationId = requestAnimationFrame(this.renderLoop);
  }

  public updateHandState(state: MultiHandState) {
    this.handState = state;
    
    // Check if we need to transition
    if (state.hands.length > 0) {
      for (const hand of state.hands) {
        if (hand.triggered !== "Unknown") {
          const matchedPlugin = SCENE_PLUGINS.find(p => p.TriggerGesture === hand.triggered);
          if (matchedPlugin && this.currentPlugin?.name !== matchedPlugin.name) {
            this.transitionToScene(matchedPlugin);
            break; 
          }
        }
      }
    }
  }

  private transitionToScene(plugin: ScenePlugin) {
    if (this.currentSceneObj) {
      this.currentSceneObj.onTransitionOut();
      this.currentSceneObj.dispose();
    }
    
    this.currentPlugin = plugin;
    const SceneClass = plugin.SceneClass as new () => BaseScene;
    this.currentSceneObj = new SceneClass();
    this.currentSceneObj.init(this.scene, this.camera, this.renderer);
    this.currentSceneObj.onTransitionIn();
    
    if (this.onSceneChange) {
      this.onSceneChange(plugin.name);
    }
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private renderLoop() {
    this.animationId = requestAnimationFrame(this.renderLoop);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.currentSceneObj) {
      this.currentSceneObj.update(time, delta, this.handState);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    cancelAnimationFrame(this.animationId);
    if (this.currentSceneObj) {
      this.currentSceneObj.dispose();
    }
    this.renderer.dispose();
  }
}
