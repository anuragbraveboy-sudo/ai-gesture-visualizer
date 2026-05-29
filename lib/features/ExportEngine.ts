export class ExportEngine {
  public static captureScreenshot(canvas: HTMLCanvasElement): void {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `gesture-visualizer-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Screenshot failed", e);
    }
  }
}
