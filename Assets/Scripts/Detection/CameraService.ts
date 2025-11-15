@component
export class CameraService extends BaseScriptComponent {
  @input cameraModule: CameraModule;

  private isEditor = global.deviceInfoSystem.isEditor();
  private cameraTexture: Texture | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.start.bind(this));
  }

  start() {
    // Determine which camera to use based on environment
    const cameraId = this.isEditor
      ? CameraModule.CameraId.Default_Color
      : CameraModule.CameraId.Right_Color;

    // Create camera request
    const cameraRequest = CameraModule.createCameraRequest();
    cameraRequest.cameraId = cameraId;
    cameraRequest.imageSmallerDimension = this.isEditor ? 352 : 756;

    // Request the camera texture
    this.cameraTexture = this.cameraModule.requestCamera(cameraRequest);

    print("CameraService initialized");
  }

  /**
   * Get the raw camera texture
   */
  getCameraTexture(): Texture | null {
    return this.cameraTexture;
  }

  /**
   * Capture a snapshot from the camera texture as a ProceduralTexture
   * This can be used for image processing or sending to AI services
   */
  captureSnapshot(): Texture | null {
    if (!this.cameraTexture) {
      print("Warning: Camera texture not initialized");
      return null;
    }

    return ProceduralTextureProvider.createFromTexture(this.cameraTexture);
  }

  /**
   * Convert world position to screen space coordinates
   * @param camera - The camera component to use for projection
   * @param worldPos - World position to convert
   * @returns Normalized screen coordinates (-1 to 1)
   */
  worldToScreenSpace(camera: Camera, worldPos: vec3): vec2 {
    const screenPoint = camera.worldSpaceToScreenSpace(worldPos);
    const localX = this.remap(screenPoint.x, 0, 1, -1, 1);
    const localY = this.remap(screenPoint.y, 1, 0, -1, 1);
    return new vec2(localX, localY);
  }

  /**
   * Remap a value from one range to another
   */
  private remap(
    value: number,
    low1: number,
    high1: number,
    low2: number,
    high2: number
  ): number {
    return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
  }
}
