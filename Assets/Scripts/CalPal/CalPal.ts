import { TriggerCommand } from "Scripts/Detection/TriggerCommand";
import { HealthGoals } from "Scripts/HealthGoal/HealthGoals";
import { delay } from "Scripts/Utility/util";
import { FoodDetectionResult } from "../Detection/DetectionResult";
import { FoodDetector } from "../Detection/FoodDetector";

@component
export class CalPal extends BaseScriptComponent {
  @input
  private foodDetector: FoodDetector;
  @input
  private healthGoals: HealthGoals;
  @input
  private scanTrigger: TriggerCommand;

  private calorieGoal: number | undefined;
  private scanCallback: (() => void) | null = null;

  onAwake() {
    print("CalPal initialized");
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  private async onStart() {
    await delay(this, 1);
    this.doCalorieWorkflow(); // Wait a few seconds before starting
  }

  private async doCalorieWorkflow() {
    const goal = await this.getCalorieGoal();
    print(`User's daily calorie goal: ${goal}`);
    await this.detectFood(goal);
  }

  private async getCalorieGoal() {
    const goal = await this.healthGoals.dictateGoal();
    await this.healthGoals.showCalorieConfirmation(goal.goal!);
    return goal.goal!;
  }

  /**
   * Detect food items on startup and print the results
   */
  private async detectFood(calorieGoal?: number): Promise<void> {
    if (!this.foodDetector) {
      print("Error: FoodDetector not assigned");
      return;
    }

    try {
      print("Starting food detection...");

      const results = await this.foodDetector.detect(calorieGoal);

      print(`Detected ${results.length} food items:`);

      results.forEach((result: FoodDetectionResult, index: number) => {
        print(`\n--- Food Item ${index + 1} ---`);
        print(`Name: ${result.name}`);
        print(`Center: [${result.center[0]}, ${result.center[1]}]`);
        print(`Calories: ${result.calories}`);
        print(`Quality: ${result.quality}`);
      });
    } catch (error) {
      print("Food detection failed: " + error);
    }
  }
}
