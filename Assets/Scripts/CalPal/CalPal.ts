import { TriggerCommand } from "Scripts/Detection/TriggerCommand";
import { HealthGoals } from "Scripts/HealthGoal/HealthGoals";
import { delay } from "Scripts/Utility/util";
import { FoodDetectionResult } from "../Detection/DetectionResult";
import { FoodDetector } from "../Detection/FoodDetector";
import { Character } from "../Character/Character";

@component
export class CalPal extends BaseScriptComponent {
  @input
  private foodDetector: FoodDetector;
  @input
  private healthGoals: HealthGoals;
  @input
  private scanTrigger: TriggerCommand;
  @input
  private character: Character;

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
    this.calorieGoal = goal;

    // Set up trigger callback for scanning
    this.setupCaptureTrigger();
  }

  /**
   * Set up the scan trigger callback
   */
  private setupCaptureTrigger(): void {
    if (!this.scanTrigger) {
      print("Warning: ScanTrigger not assigned");
      return;
    }

    // Create and store the callback
    this.scanCallback = () => {
      print("Scan trigger fired!");
      this.detectFood(this.calorieGoal);
    };

    // Add the callback to the trigger
    this.scanTrigger.addTriggerCallback(this.scanCallback);
    print("Scan trigger callback registered");
  }

  private async getCalorieGoal() {
    const goal = await this.healthGoals.dictateGoal();
    await this.healthGoals.showCalorieConfirmation(goal.goal!);

    // Instruct user to use capture command
    if (this.character) {
      this.character.sayText("Say 'capture' to examine your food");
    }

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

    // Remove handler to prevent duplicate scan requests
    if (this.scanTrigger && this.scanCallback) {
      this.scanTrigger.removeTriggerCallback(this.scanCallback);
      print("Scan trigger handler removed during detection");
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
    } finally {
      // Re-add handler after detection completes
      if (this.scanTrigger && this.scanCallback) {
        this.scanTrigger.addTriggerCallback(this.scanCallback);
        print("Scan trigger handler re-added after detection");
      }
    }
  }
}
