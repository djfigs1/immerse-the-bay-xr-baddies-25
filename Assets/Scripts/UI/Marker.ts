import { FoodDetectionResult } from "../Detection/DetectionResult";

@component
export class Marker extends BaseScriptComponent {
  @input
  @hint("Text component to display marker label")
  text3d: Text3D;

  private currentResult: FoodDetectionResult | null = null;

  /**
   * Show the marker with the detection result information
   * @param result The food detection result to display
   */
  show(result: FoodDetectionResult): void {
    this.currentResult = result;

    // Set the text field with the food name
    if (this.text3d) {
      this.text3d.text = result.name;
    } else {
      print("Warning: Text field not assigned to marker");
    }

    // Enable the marker scene object
    this.getSceneObject().enabled = true;

    print(
      `Marker showing: ${result.name} (${result.calories} cal, ${result.quality})`
    );
  }

  /**
   * Hide the marker
   */
  hide(): void {
    this.getSceneObject().enabled = false;
  }

  /**
   * Get the current detection result
   * @returns The current detection result or null if none
   */
  getResult(): FoodDetectionResult | null {
    return this.currentResult;
  }
}
