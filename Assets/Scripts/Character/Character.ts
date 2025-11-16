export enum RabbitState {
  TailWag = "TailWag",
  Ears = "Ears",
  Green = "Green",
  Orange = "Orange",
  Red = "Red",
  Rotating = "Rotating",
}

const DEFAULT_STATE = RabbitState.TailWag;

@component
export class Character extends BaseScriptComponent {
  @input
  @hint("Text component for the speech bubble")
  speechText: Text;

  @input
  @hint("Parent scene object containing the speech bubble")
  speechBubbleParent: SceneObject;

  @input
  @hint("Tail wag rabbit model scene object")
  tailWagRabbit: SceneObject;

  @input
  @hint("Rabbit ears model scene object")
  rabbitEars: SceneObject;

  @input
  @hint("Green rabbit model scene object")
  greenRabbit: SceneObject;

  @input
  @hint("Orange rabbit model scene object")
  orangeRabbit: SceneObject;

  @input
  @hint("Red rabbit model scene object")
  redRabbit: SceneObject;

  @input
  @hint("Rotating rabbit model scene object")
  rotatingRabbit: SceneObject;

  private timeoutEvent: DelayedCallbackEvent | null = null;
  private stateTimeoutEvent: DelayedCallbackEvent | null = null;
  private currentState: RabbitState = DEFAULT_STATE;

  onAwake() {
    // Hide speech bubble initially
    if (this.speechBubbleParent) {
      this.speechBubbleParent.enabled = false;
    }

    // Initialize state - show only the default state
    this.setState(this.currentState);
  }

  /**
   * Make the character say something in a speech bubble
   * @param text The text to display in the speech bubble
   * @param timeout Optional timeout in seconds to automatically close the speech bubble. If not provided, bubble stays visible.
   */
  sayText(text: string, timeout?: number): void {
    if (!this.speechText) {
      print("Warning: Speech text component not assigned to Character");
      return;
    }

    if (!this.speechBubbleParent) {
      print(
        "Warning: Speech bubble parent scene object not assigned to Character"
      );
      return;
    }

    // Cancel any existing timeout
    if (this.timeoutEvent) {
      this.timeoutEvent.cancel();
      this.timeoutEvent = null;
    }

    // Set the text
    this.speechText.text = text;

    // Show the speech bubble
    this.speechBubbleParent.enabled = true;

    // Set up timeout if specified
    if (timeout !== undefined && timeout > 0) {
      this.timeoutEvent = this.createEvent("DelayedCallbackEvent");
      this.timeoutEvent.bind(() => {
        this.hideSpeechBubble();
      });
      this.timeoutEvent.reset(timeout);
    }

    print(`Character says: "${text}"`);
  }

  /**
   * Hide the speech bubble
   */
  hideSpeechBubble(): void {
    if (this.speechBubbleParent) {
      this.speechBubbleParent.enabled = false;
    }

    // Cancel timeout if exists
    if (this.timeoutEvent) {
      this.timeoutEvent.cancel();
      this.timeoutEvent = null;
    }
  }

  /**
   * Check if the speech bubble is currently visible
   */
  isSpeaking(): boolean {
    return this.speechBubbleParent ? this.speechBubbleParent.enabled : false;
  }

  /**
   * Set the rabbit state and update visible model
   * @param state The rabbit state to set. If undefined, uses the default state (TailWag)
   * @param timeout Optional timeout in seconds to return to default state. If not provided, state stays until changed.
   */
  setState(state?: RabbitState, timeout?: number): void {
    // Cancel any existing state timeout
    if (this.stateTimeoutEvent) {
      this.stateTimeoutEvent.cancel();
      this.stateTimeoutEvent = null;
    }

    this.currentState = state ?? DEFAULT_STATE;

    // Hide all models first
    this.tailWagRabbit.enabled = false;
    this.rabbitEars.enabled = false;
    this.greenRabbit.enabled = false;
    this.orangeRabbit.enabled = false;
    this.redRabbit.enabled = false;
    this.rotatingRabbit.enabled = false;

    // Show only the active state model
    switch (this.currentState) {
      case RabbitState.TailWag:
        if (this.tailWagRabbit !== undefined) {
          this.tailWagRabbit.enabled = true;
          this.restartAnimations(this.tailWagRabbit);
        } else {
          print("Warning: Tail wag rabbit model not assigned");
        }
        break;
      case RabbitState.Ears:
        if (this.rabbitEars !== undefined) {
          this.rabbitEars.enabled = true;
          this.restartAnimations(this.rabbitEars);
        } else {
          print("Warning: Rabbit ears model not assigned");
        }
        break;
      case RabbitState.Green:
        if (this.greenRabbit) {
          this.greenRabbit.enabled = true;
          this.restartAnimations(this.greenRabbit);
        } else {
          print("Warning: Green rabbit model not assigned");
        }
        break;
      case RabbitState.Orange:
        if (this.orangeRabbit) {
          this.orangeRabbit.enabled = true;
          this.restartAnimations(this.orangeRabbit);
        } else {
          print("Warning: Orange rabbit model not assigned");
        }
        break;
      case RabbitState.Red:
        if (this.redRabbit) {
          this.redRabbit.enabled = true;
          this.restartAnimations(this.redRabbit);
        } else {
          print("Warning: Red rabbit model not assigned");
        }
        break;
      case RabbitState.Rotating:
        if (this.rotatingRabbit) {
          this.rotatingRabbit.enabled = true;
          this.restartAnimations(this.rotatingRabbit);
        } else {
          print("Warning: Rotating rabbit model not assigned");
        }
        break;
    }

    print(`Character state changed to: ${this.currentState}`);

    // Set up timeout to return to default state if specified
    if (
      timeout !== undefined &&
      timeout > 0 &&
      this.currentState !== DEFAULT_STATE
    ) {
      this.stateTimeoutEvent = this.createEvent("DelayedCallbackEvent");
      this.stateTimeoutEvent.bind(() => {
        this.setState(); // Return to default state
      });
      this.stateTimeoutEvent.reset(timeout);
    }
  }

  /**
   * Get the current rabbit state
   */
  getState(): RabbitState {
    return this.currentState;
  }

  /**
   * Restart all animations in child AnimationPlayer components
   * @param parent The parent scene object to search for AnimationPlayer components
   */
  private restartAnimations(parent: SceneObject): void {
    if (!parent) {
      return;
    }

    // Check if this object has an AnimationPlayer component
    const animPlayer = parent.getComponent(
      "Component.AnimationPlayer"
    ) as AnimationPlayer;
    if (animPlayer) {
      // Restart the animation from the beginning by toggling enabled
      animPlayer.stopAll();
      animPlayer.playAll();
    } else {
      print("Warning: AnimationPlayer component not found on scene object");
    }

    // Recursively check all children
    const childCount = parent.getChildrenCount();
    for (let i = 0; i < childCount; i++) {
      const child = parent.getChild(i);
      this.restartAnimations(child);
    }
  }
}
