import { DepthCache } from "Scripts/Detection/DepthCache";
import { FoodDetectionResult } from "../Detection/DetectionResult";
import { FoodDetector } from "../Detection/FoodDetector";
import { delay } from "Scripts/Utility/util";
import { Marker } from "Scripts/UI/Marker";

@component
export class CalPal extends BaseScriptComponent {
  @input
  private foodDetector: FoodDetector;
  @input
  private depthCache: DepthCache;

  @input
  private marker3D: ObjectPrefab;

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

        const width = tex.getWidth();
        const height = tex.getHeight();

        const worldPos = this.depthCache.getWorldPositionWithID(
          new vec2(result.center[0] * width, (1 - result.center[1]) * height),
          depthId
        );

        if (worldPos && this.marker3D) {
          print(`World position: ${worldPos.toString()}`);

          // Instantiate the marker prefab at the world position
          const markerObj = this.marker3D.instantiate(null);
          const marker = markerObj.getComponent(Marker.getTypeName()) as Marker;
          marker.show(result);

          markerObj.getTransform().setWorldPosition(worldPos);

          print(
            `Instantiated marker at world position: ${worldPos.toString()}`
          );
        } else {
          if (!worldPos) {
            print("Warning: Could not get world position for detection");
          }
          if (!this.marker3D) {
            print("Warning: marker3D prefab not assigned");
          }
        }
      });
    } catch (error) {
      print("Food detection failed: " + error);
    }
  }
}
