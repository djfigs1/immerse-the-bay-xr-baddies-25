import { GeminiRestClient } from "Scripts/AI/GeminiRest";
import { FoodDetectionResult } from "./DetectionResult";
import { DepthCache } from "./DepthCache";
import { Marker } from "Scripts/UI/Marker";
import { Character, RabbitState } from "Scripts/Character/Character";

const SELECT_DURATION = 5.0;

@component
export class FoodDetector extends BaseScriptComponent {
  @input
  private geminiClient: GeminiRestClient;

  @input
  @hint("DepthCache component for world position calculation")
  private depthCache: DepthCache;

  @input
  @hint("3D marker prefab to instantiate at food locations")
  private marker3D: ObjectPrefab;

  @input
  @hint("Character component to respond to food selections")
  private character: Character;

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
    // Set character to thinking state
    if (this.character) {
      this.character.setState(RabbitState.Ears);
    }

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

      // Return to default state after detection completes
      if (this.character) {
        this.character.setState();
      }

      return results;
    } catch (e) {
      print("Error parsing food detection results: " + e);
      // Return to default state on error too
      if (this.character) {
        this.character.setState();
      }
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

  /**
   * Handle when a marker is selected by the user
   * @param result The food detection result from the selected marker
   */
  private onMarkerSelected(result: FoodDetectionResult): void {
    if (!this.character) {
      print("Warning: Character component not assigned");
      return;
    }

    const quality = result.quality.toLowerCase();

    switch (quality) {
      case "healthy":
        this.character.sayText("Yes, great choice!", SELECT_DURATION);
        this.character.setState(RabbitState.Green, SELECT_DURATION);
        break;
      case "unhealthy":
        this.character.sayText(
          "Whoops, this is not a great choice, try again",
          SELECT_DURATION
        );
        this.character.setState(RabbitState.Red, SELECT_DURATION);
        break;
      case "neutral":
      default:
        this.character.sayText(
          "This won't affect your calorie goal, feel free to have it or not.",
          SELECT_DURATION
        );
        this.character.setState(RabbitState.Orange, SELECT_DURATION);
        break;
    }

    print(`Marker selected: ${result.name} (${quality})`);
  }

  /**
   * Place 3D markers at detected food locations
   * @param results The food detection results
   * @param tex The texture that was used for detection
   * @param depthId The depth frame ID from the depth cache
   */
  public placeMarkers(
    results: FoodDetectionResult[],
    tex: Texture,
    depthId: number
  ): void {
    if (!this.depthCache) {
      print("Warning: DepthCache not assigned, cannot place markers");
      return;
    }

    if (!this.marker3D) {
      print("Warning: marker3D prefab not assigned, cannot place markers");
      return;
    }

    const width = tex.getWidth();
    const height = tex.getHeight();

    results.forEach((result: FoodDetectionResult, index: number) => {
      const worldPos = this.depthCache.getWorldPositionWithID(
        new vec2(result.center[0] * width, result.center[1] * height),
        depthId
      );

      if (worldPos) {
        print(`World position for ${result.name}: ${worldPos.toString()}`);

        // Instantiate the marker prefab at the world position
        const markerObj = this.marker3D.instantiate(null);
        const marker = markerObj.getComponent(Marker.getTypeName()) as Marker;
        marker.show(result);
        // Set up the selection callback
        marker.setOnSelectedCallback(this.onMarkerSelected.bind(this));

        markerObj.getTransform().setWorldPosition(worldPos);

        print(
          `Instantiated marker for ${
            result.name
          } at world position: ${worldPos.toString()}`
        );
      } else {
        print(`Warning: Could not get world position for ${result.name}`);
      }
    });
  }
}
