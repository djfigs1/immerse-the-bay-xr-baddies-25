import { VoiceInput } from "../Utility/VoiceInput";

@component
export class TriggerCommand extends BaseScriptComponent {
  @input
  @hint("VoiceInput component for speech recognition")
  private voiceInput: VoiceInput;

  @input
  @hint("Trigger word to listen for (e.g., 'scan', 'detect')")
  public triggerWord: string = "scan";

  private callbacks: (() => void)[] = [];
  private voiceHandler:
    | ((args: { speech: string; isFinalized: boolean }) => void)
    | null = null;

  onAwake() {
    const startEvent = this.createEvent("OnStartEvent");
    startEvent.bind(() => {
      this.onStart();
    });
  }

  onStart() {
    if (!this.voiceInput) {
      print("Warning: VoiceInput component not assigned to ScanCommand");
      return;
    }

    // Attach the handler to VoiceInput (but don't start/stop listening)
    this.attachHandler();
  }

  /**
   * Add a callback to be invoked when the trigger word is detected
   * @param callback Function to call when trigger word is heard
   */
  public addTriggerCallback(callback: () => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback from the trigger list
   * @param callback Function to remove
   */
  public removeTriggerCallback(callback: () => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Attach the voice handler to VoiceInput
   */
  private attachHandler(): void {
    if (!this.voiceInput) {
      return;
    }

    this.voiceHandler = (args: { speech: string; isFinalized: boolean }) => {
      if (!args.isFinalized) {
        return;
      }

      const speech = args.speech.toLowerCase().trim();
      const triggerLower = this.triggerWord.toLowerCase().trim();

      // Check if the trigger word is in the speech
      if (speech.includes(triggerLower)) {
        print(`Trigger word detected: "${this.triggerWord}"`);
        this.fireTrigger();
      }
    };

    this.voiceInput.addInputHandler(this.voiceHandler);
    print(
      `ScanCommand attached handler for trigger word: "${this.triggerWord}"`
    );
  }

  /**
   * Fire all registered callbacks
   */
  private fireTrigger(): void {
    print(`Firing ${this.callbacks.length} trigger callbacks`);
    this.callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        print(`Error executing trigger callback: ${error}`);
      }
    });
  }

  /**
   * Detach the voice handler from VoiceInput
   */
  public detachHandler(): void {
    if (this.voiceInput && this.voiceHandler) {
      this.voiceInput.removeInputHandler(this.voiceHandler);
      this.voiceHandler = null;
      print("ScanCommand detached handler");
    }
  }
}
