import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { FoodDetectionResult } from "../Detection/DetectionResult";

@component
export class Marker extends BaseScriptComponent {
  @input
  @hint("Text component to display marker label")
  text3d: Text3D;

  @input
  @hint("InteractionComponent to listen for tap/click events")
  interactable: Interactable;

  private currentResult: FoodDetectionResult | null = null;
  private onSelectedCallback: ((result: FoodDetectionResult) => void) | null =
    null;

  onAwake() {
    const startEvent = this.createEvent("OnStartEvent");
    startEvent.bind(() => {
      this.onStart();
    });
  }

  onStart() {
    // Set up interaction listener
    if (this.interactable) {
      this.interactable.onTriggerEnd.add(() => {
        this.onSelected();
      });
    } else {
      print("Warning: InteractionComponent not assigned to Marker");
    }
  }

  /**
   * Set the callback function to be called when marker is selected
   * @param callback Function to call with the FoodDetectionResult when selected
   */
  setOnSelectedCallback(callback: (result: FoodDetectionResult) => void): void {
    this.onSelectedCallback = callback;
  }

  /**
   * Called when the marker is selected/clicked
   */
  onSelected(): void {
    if (this.currentResult && this.onSelectedCallback) {
      this.onSelectedCallback(this.currentResult);
      print(`Marker selected: ${this.currentResult.name}`);
    } else if (!this.currentResult) {
      print("Warning: No result stored in marker");
    } else if (!this.onSelectedCallback) {
      print("Warning: No callback set for marker selection");
    }
  }

  /**
   * Show the marker with the detection result information
   * @param result The food detection result to display
   */
  show(result: FoodDetectionResult): void {
    this.currentResult = result;

    // Set the text field with the food name
    if (this.text3d) {
      this.text3d.text = result.name + "\n" + result.calories + " cal";
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
