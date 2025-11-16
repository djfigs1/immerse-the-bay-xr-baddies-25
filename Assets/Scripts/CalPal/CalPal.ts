import { FoodDetector } from "../Detection/FoodDetector";
import { FoodDetectionResult } from "../Detection/DetectionResult";
import { DetectionSquares } from "../UI/DetectionSquares";

@component
export class CalPal extends BaseScriptComponent {
  @input
  private foodDetector: FoodDetector;

  @input
  private detectionSquares: DetectionSquares;

  onAwake() {
    print("CalPal initialized");
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  private onStart() {
    this.detectFoodOnStartup();
  }

  /**
   * Detect food items on startup and print the results
   */
  private async detectFoodOnStartup(): Promise<void> {
    if (!this.foodDetector) {
      print("Error: FoodDetector not assigned");
      return;
    }

    try {
      print("Starting food detection...");
      const results = await this.foodDetector.detect();

      print(`Detected ${results.length} food items:`);

      results.forEach((result: FoodDetectionResult, index: number) => {
        print(`\n--- Food Item ${index + 1} ---`);
        print(`Name: ${result.name}`);
        print(`Center: [${result.center[0]}, ${result.center[1]}]`);
        print(`Calories: ${result.calories}`);
        print(`Quality: ${result.quality}`);
      });

      // Draw detection markers on screen
      if (this.detectionSquares) {
        this.detectionSquares.drawDetections(results);
      } else {
        print("Warning: DetectionSquares component not assigned");
      }
    } catch (error) {
      print("Food detection failed: " + error);
    }
  }
}
