import { GeminiRestClient } from "Scripts/AI/GeminiRest";
import { FoodDetectionResult } from "./DetectionResult";

@component
export class FoodDetector extends BaseScriptComponent {
  @input
  private geminiClient: GeminiRestClient;

  @input
  @widget(new TextAreaWidget())
  @hint("The prompt to send with the camera image")
  public imagePrompt: string =
    "What food items can you see in this image? Provide nutritional information.";

  onAwake() {
    print("CalPal initialized");
  }

  /**
   * Detect food items in the current camera view
   */
  async detect(tex: Texture): Promise<FoodDetectionResult[]> {
    // Capture snapshot from camera
    const snapshot = ProceduralTextureProvider.createFromTexture(tex);

    // Send to Gemini for analysis
    const prompt =
      this.imagePrompt ||
      "What food items can you see in this image? Provide nutritional information.";
    const response = await this.geminiClient.sendImage(snapshot, prompt);

    console.log("Gemini response: " + response);

    // Parse response
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      console.log("JSON Text: " + jsonText);
      const data = JSON.parse(jsonText);
      const results = this.validateFoodDetectionResults(data);

      return results;
    } catch (e) {
      print("Error parsing food detection results: " + e);
      throw e;
    }
  }

  /**
   * Validate that the parsed response matches the FoodDetectionResult schema
   * @param data The parsed JSON data to validate
   * @throws Error if validation fails
   * @returns The validated array of FoodDetectionResult
   */
  private validateFoodDetectionResults(data: any): FoodDetectionResult[] {
    if (!Array.isArray(data?.items)) {
      throw new Error(
        "Expected array of FoodDetectionResult, got: " + typeof data
      );
    }

    let items = data.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

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

    return data.items as FoodDetectionResult[];
  }
}
