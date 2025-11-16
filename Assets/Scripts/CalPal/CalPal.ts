import { DepthCache } from "Scripts/Detection/DepthCache";
import { FoodDetectionResult } from "../Detection/DetectionResult";
import { FoodDetector } from "../Detection/FoodDetector";
import { delay } from "Scripts/Utility/util";
import { Marker } from "Scripts/UI/Marker";
import { HealthGoals } from "Scripts/HealthGoal/HealthGoals";

@component
export class CalPal extends BaseScriptComponent {
  @input
  private foodDetector: FoodDetector;
  @input
  private depthCache: DepthCache;
  @input
  private healthGoals: HealthGoals;

  onAwake() {
    print("CalPal initialized");
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  private async onStart() {
    await delay(this, 2); // Wait a few seconds before starting
    this.detectFoodOnStartup();
  }

  private async doCalorieWorkflow() {
    const goal = await this.getCalorieGoal();
    print(`User's daily calorie goal: ${goal}`);
  }

  private async getCalorieGoal() {
    const goal = await this.healthGoals.dictateGoal();
    this.healthGoals.showCalorieConfirmation(goal.goal!);
    return goal.goal!;
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
      await delay(this, 3);
      print("Starting food detection...");

      // Capture the camera texture
      const depthId = this.depthCache.saveDepthFrame();
      const tex = this.depthCache.getCamImageWithID(depthId);

      const results = await this.foodDetector.detect(tex);

      print(`Detected ${results.length} food items:`);

      results.forEach((result: FoodDetectionResult, index: number) => {
        print(`\n--- Food Item ${index + 1} ---`);
        print(`Name: ${result.name}`);
        print(`Center: [${result.center[0]}, ${result.center[1]}]`);
        print(`Calories: ${result.calories}`);
        print(`Quality: ${result.quality}`);
      });

      // Place 3D markers at detected food locations
      this.foodDetector.placeMarkers(results, tex, depthId);
    } catch (error) {
      print("Food detection failed: " + error);
    }
  }
}
