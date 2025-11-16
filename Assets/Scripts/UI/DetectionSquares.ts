import { FoodDetectionResult } from "../Detection/DetectionResult";
import { Marker } from "./Marker";

@component
export class DetectionSquares extends BaseScriptComponent {
  @input
  @hint("Container scene object to hold all detection markers")
  container: SceneObject;

  @input
  @hint("Prefab to instantiate for each detection marker")
  markerPrefab: ObjectPrefab;

  /**
   * Draw detection markers on screen based on normalized coordinates
   * @param detections Array of food detection results with normalized center coordinates
   */
  drawDetections(detections: FoodDetectionResult[]): void {
    // Clear all existing markers
    this.clearMarkers();

    // Create a marker for each detection
    detections.forEach((detection) => {
      this.createMarker(detection);
    });

    print(`Drew ${detections.length} detection markers`);
  }

  /**
   * Clear all existing marker children from the container
   */
  private clearMarkers(): void {
    if (!this.container) {
      print("Warning: Container not set");
      return;
    }

    // Destroy all children of the container
    const childCount = this.container.getChildrenCount();
    for (let i = childCount - 1; i >= 0; i--) {
      const child = this.container.getChild(i);
      child.destroy();
    }
  }

  /**
   * Create a marker at the specified normalized coordinates
   * @param detection Detection result with center coordinates [x, y] in range [0, 1]
   */
  private createMarker(detection: FoodDetectionResult): void {
    if (!this.markerPrefab) {
      print("Warning: Marker prefab not set");
      return;
    }

    // Instantiate the marker prefab
    const markerObj = this.markerPrefab.instantiate(this.container);

    // Get the Marker component
    const marker = markerObj.getComponent(Marker.getTypeName()) as Marker;

    if (marker) {
      marker.show(detection);
    } else {
      print("Warning: Marker prefab does not have a Marker component");
    }

    // Get the ScreenTransform component
    const screenTransform = markerObj.getComponent(
      "Component.ScreenTransform"
    ) as ScreenTransform;

    if (!screenTransform) {
      print("Warning: Marker prefab does not have a ScreenTransform component");
      markerObj.destroy();
      return;
    }

    // Convert from [0, 1] detection coordinates to [-1, 1] screen coordinates
    // detection.center is [x, y] where both are in range [0, 1]
    // ScreenTransform anchors use [-1, 1] where:
    //   x: -1 (left) to 1 (right)
    //   y: -1 (bottom) to 1 (top)
    const [x0to1, y0to1] = detection.center;
    const x = x0to1 * 2 - 1; // Convert [0, 1] to [-1, 1]
    const y = y0to1 * 2 - 1; // Convert [0, 1] to [-1, 1]

    screenTransform.anchors.setCenter(new vec2(x, -y));

    print(
      `Created marker for ${detection.name} at screen coords (${x.toFixed(
        2
      )}, ${y.toFixed(2)})`
    );
  }
}
