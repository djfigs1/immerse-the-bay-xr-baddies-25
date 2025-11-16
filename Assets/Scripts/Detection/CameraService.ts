import { delay } from "Scripts/Utility/util";

@component
export class CameraService extends BaseScriptComponent {
  @input cameraModule: CameraModule;

  private isEditor = global.deviceInfoSystem.isEditor();
  private cameraTexture: Texture | null = null;
  private cameraFrame: CameraFrame | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.start.bind(this));
  }

  start() {
    // Determine which camera to use based on environment
    const cameraId = CameraModule.CameraId.Default_Color;

    // Create camera request
    const cameraRequest = CameraModule.createCameraRequest();
    cameraRequest.cameraId = cameraId;
    cameraRequest.imageSmallerDimension = 512;

    // Request the camera texture
    this.cameraTexture = this.cameraModule.requestCamera(cameraRequest);
    let camTexControl = this.cameraTexture.control as CameraTextureProvider;
    camTexControl.onNewFrame.add((frame) => {
      this.cameraFrame = frame;
    });

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
   * Waits for the texture to be loaded before capturing
   */
  async captureSnapshot(): Promise<Texture | null> {
    if (!this.cameraTexture) {
      print("Warning: Camera texture not initialized");
      return null;
    }

    let provider = this.cameraTexture.control as CameraTextureProvider;
    while (this.cameraFrame === null) {
      await delay(this, 0.5);
    }

    return ProceduralTextureProvider.createFromTexture(this.cameraTexture);
  }
}
