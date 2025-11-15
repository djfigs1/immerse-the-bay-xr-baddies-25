import { CameraService } from "../Detection/CameraService";
import { GeminiClient } from "../AI/Gemini";
import { FoodDetectionResult } from "./DetectionResult";

@component
export class FoodDetector extends BaseScriptComponent {
  @input
  private cameraService: CameraService;

  @input
  private geminiClient: GeminiClient;

  @input
  @widget(new TextAreaWidget())
  @hint("The prompt to send with the camera image")
  public imagePrompt: string =
    "What food items can you see in this image? Provide nutritional information.";

  onAwake() {
    print("CalPal initialized");
  }

  /**
   * Capture an image from the camera and send it to Gemini with the configured prompt
   * @returns Promise that resolves with an array of FoodDetectionResult
   */
  public async detect(): Promise<FoodDetectionResult[]> {
    if (!this.cameraService) {
      const error = "CameraService not assigned";
      print("Error: " + error);
      return Promise.reject(error);
    }

    if (!this.geminiClient) {
      const error = "GeminiClient not assigned";
      print("Error: " + error);
      return Promise.reject(error);
    }

    print("Capturing camera snapshot...");
    const snapshot = this.cameraService.captureSnapshot();

    if (!snapshot) {
      const error = "Failed to capture camera snapshot";
      print("Error: " + error);
      return Promise.reject(error);
    }

    print("Sending image to Gemini with prompt: " + this.imagePrompt);

    try {
      const response = await this.geminiClient.sendImage(
        snapshot,
        this.imagePrompt
      );
      print("Gemini response received: " + response);

      // Parse JSON response
      let parsedResponse: FoodDetectionResult[];
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        const error = "Failed to parse Gemini response as JSON: " + parseError;
        print("Error: " + error);
        throw new Error(error);
      }

      // Validate schema
      this.validateFoodDetectionResults(parsedResponse);

      print(`Successfully detected ${parsedResponse.length} food items`);
      return parsedResponse;
    } catch (error) {
      print("Error from Gemini or parsing: " + error);
      throw error;
    }
  }

  /**
   * Validate that the parsed response matches the FoodDetectionResult schema
   * @param data The parsed JSON data to validate
   * @throws Error if validation fails
   */
  private validateFoodDetectionResults(data: unknown): void {
    if (!Array.isArray(data)) {
      throw new Error(
        "Expected array of FoodDetectionResult, got: " + typeof data
      );
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (typeof item.name !== "string") {
        throw new Error(`Item ${i}: 'name' must be a string`);
      }

      if (
        !Array.isArray(item.center) ||
        item.center.length !== 2 ||
        typeof item.center[0] !== "number" ||
        typeof item.center[1] !== "number"
      ) {
        throw new Error(`Item ${i}: 'center' must be [number, number]`);
      }

      if (typeof item.calories !== "number") {
        throw new Error(`Item ${i}: 'calories' must be a number`);
      }

      if (
        item.quality !== "healthy" &&
        item.quality !== "unhealthy" &&
        item.quality !== "neutral"
      ) {
        throw new Error(
          `Item ${i}: 'quality' must be 'healthy', 'unhealthy', or 'neutral'`
        );
      }
    }
  }
}
