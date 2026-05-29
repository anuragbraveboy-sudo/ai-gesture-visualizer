import * as THREE from 'three';
import { BaseScene } from '../scenes/BaseScene';
import { MultiHandState, ScenePlugin, AudioState } from './EngineInterfaces';
import { AudioEngine } from '../features/AudioEngine';

// Plugins
import { NeonCathedral } from '../scenes/NeonCathedral';
import { GalaxyParticles } from '../scenes/GalaxyParticles';
import { EnergyPulse } from '../scenes/EnergyPulse';
import { PortalScene } from '../scenes/PortalScene';
import { GalaxyExplosion } from '../scenes/GalaxyExplosion';
import { EnergyBeam } from '../scenes/EnergyBeam';

export const SCENE_PLUGINS: ScenePlugin[] = [
  // Dual-hand scenes (higher priority)
  { name: "Portal Scene", TriggerGesture: "Open Palm", TriggerGesture2: "Open Palm", SceneClass: PortalScene },
  { name: "Galaxy Explosion", TriggerGesture: "Peace Sign", TriggerGesture2: "Peace Sign", SceneClass: GalaxyExplosion },
  { name: "Energy Beam", TriggerGesture: "Open Palm", TriggerGesture2: "Thumbs Up", SceneClass: EnergyBeam },
  { name: "Energy Beam", TriggerGesture: "Thumbs Up", TriggerGesture2: "Open Palm", SceneClass: EnergyBeam },
  // Single-hand scenes
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
  private handState: MultiHandState = { hands: [], distance: 0 };
  private audioEngine: AudioEngine | null = null;
  
  public onSceneChange?: (sceneName: string) => void;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, audioEngine: AudioEngine) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.clock = new THREE.Clock();
    this.audioEngine = audioEngine;
    
    this.renderLoop = this.renderLoop.bind(this);
    this.animationId = requestAnimationFrame(this.renderLoop);
  }

  public updateHandState(state: MultiHandState) {
    this.handState = state;
    
    if (state.hands.length > 0) {
      let matchedPlugin: ScenePlugin | undefined = undefined;

      // Try dual-hand matches first
      if (state.hands.length >= 2) {
        const t1 = state.hands[0].triggered;
        const t2 = state.hands[1].triggered;
        
        matchedPlugin = SCENE_PLUGINS.find(p => 
          p.TriggerGesture2 && 
          ((p.TriggerGesture === t1 && p.TriggerGesture2 === t2) || 
           (p.TriggerGesture === t2 && p.TriggerGesture2 === t1))
        );
      }

      // Try single-hand matches if no dual match
      if (!matchedPlugin) {
        for (const hand of state.hands) {
          if (hand.triggered !== "Unknown") {
            matchedPlugin = SCENE_PLUGINS.find(p => p.TriggerGesture === hand.triggered && !p.TriggerGesture2);
            if (matchedPlugin) break;
          }
        }
      }

      if (matchedPlugin && this.currentPlugin?.name !== matchedPlugin.name) {
        this.transitionToScene(matchedPlugin);
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

    const audioData = this.audioEngine ? this.audioEngine.getAudioData() : { amplitude: 0, frequencyData: null };

    if (this.currentSceneObj) {
      this.currentSceneObj.update(time, delta, this.handState, audioData);
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
