export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;
  public isReady: boolean = false;
  public error: string | null = null;

  public async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = this.context.createMediaStreamSource(this.stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isReady = true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.error = "Mic permission denied or unavailable";
        this.isReady = false;
        console.warn("AudioEngine fallback mode:", err.message);
      }
    }
  }

  public getAudioData(): { amplitude: number; frequencyData: Uint8Array | null } {
    if (!this.isReady || !this.analyser || !this.dataArray) {
      return { amplitude: 0, frequencyData: null };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getByteFrequencyData(this.dataArray as any);
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const amplitude = sum / this.dataArray.length / 255.0; // Normalized 0-1

    return { amplitude, frequencyData: this.dataArray };
  }

  public dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.context) {
      this.context.close();
    }
    this.isReady = false;
  }
}
