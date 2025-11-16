import { GeminiRestClient } from "../AI/GeminiRest";
import { VoiceInput } from "../Utility/VoiceInput";
import { HealthGoalResult } from "./HealthGoalResult";
import { Character, RabbitState } from "../Character/Character";

@component
export class HealthGoals extends BaseScriptComponent {
  @input
  private geminiClient: GeminiRestClient;

  @input
  @hint("VoiceInput component for speech-to-text transcription")
  private voiceInput: VoiceInput;

  @input
  @hint("Character component to display information through speech")
  private character: Character;

  @input
  @widget(new TextAreaWidget())
  @hint("The prompt to send to Gemini for calorie goal generation")
  public prompt: string = "";

  /**
   * Get calorie goal based on user input text
   * @param userInput User information to base the calorie goal on
   * @returns Promise that resolves with HealthGoalResult
   */
  public async getGoal(userInput: string): Promise<HealthGoalResult> {
    if (!this.geminiClient) {
      throw new Error("GeminiClient not assigned");
    }

    print("Requesting calorie goal from Gemini...");

    // Set character to thinking state
    if (this.character) {
      this.character.setState(RabbitState.Ears);
    }

    // Combine the prompt with user input
    const fullPrompt = this.prompt + userInput;

    // Send to Gemini for analysis
    const response = await this.geminiClient.sendText(fullPrompt);

    print("Gemini response: " + response);

    // Parse response
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      print("JSON Text: " + jsonText);
      const data = JSON.parse(jsonText);
      const goal = this.validateHealthGoal(data);

      print(`Goal generated: ${goal.goal} calories`);

      // Return character to default state
      if (this.character) {
        this.character.setState();
      }

      return goal;
    } catch (e) {
      print("Error parsing calorie goal: " + e);

      // Return character to default state on error
      if (this.character) {
        this.character.setState();
      }

      throw e;
    }
  }

  /**
   * Validate that the parsed response matches the HealthGoalResult schema
   * @param data The parsed JSON data to validate
   * @throws Error if validation fails
   * @returns The validated HealthGoalResult
   */
  private validateHealthGoal(data: unknown): HealthGoalResult {
    if (typeof data !== "object" || data === null) {
      throw new Error("Expected object, got: " + typeof data);
    }

    const obj = data as any;

    // Goal is optional, but if present must be a number
    if (obj.goal !== undefined && typeof obj.goal !== "number") {
      throw new Error("'goal' must be a number");
    }

    // Clarify is optional, but if present must be a string
    if (obj.clarify !== undefined && typeof obj.clarify !== "string") {
      throw new Error("'clarify' must be a string");
    }

    return {
      goal: obj.goal,
      clarify: obj.clarify,
    };
  }

  /**
   * Display the calorie goal for 5 seconds
   * @param calorieGoal The calorie goal to display
   * @returns Promise that resolves after 5 seconds
   */
  public async showCalorieConfirmation(calorieGoal: number): Promise<void> {
    if (!this.character) {
      print("Warning: Character component not assigned");
      return;
    }

    const message = `Okay great! I'll set a goal of ${calorieGoal} calories for you.`;
    print(message);
    this.character.sayText(message, 5.0);

    // Wait for 5 seconds
    return new Promise<void>((resolve) => {
      const delayedEvent = this.createEvent("DelayedCallbackEvent");
      delayedEvent.bind(() => {
        resolve();
      });
      delayedEvent.reset(5.0); // 5 seconds
    });
  }

  /**
   * Start health goal dictation flow with initial prompt
   * @param onDictationStop Optional callback called when dictation stops (receives final transcribed text)
   * @param onClarificationRequested Optional callback called when clarification is requested (receives clarification question)
   * @returns Promise that resolves with HealthGoalResult based on the dictated input
   */
  public async dictateGoal(
    onDictationStop?: (transcribedText: string) => void,
    onClarificationRequested?: (clarification: string) => void
  ): Promise<HealthGoalResult> {
    if (!this.character) {
      print("Warning: Character component not assigned");
    } else {
      this.character.sayText("What are your health goals?");
    }

    return this.dictateGoalRecursive(
      onDictationStop,
      onClarificationRequested,
      ""
    );
  }

  /**
   * Use speech-to-text to dictate a health goal prompt (recursive for clarifications)
   * @param onDictationStop Optional callback called when dictation stops (receives final transcribed text)
   * @param onClarificationRequested Optional callback called when clarification is requested (receives clarification question)
   * @param conversationHistory Internal parameter for maintaining conversation context across clarifications
   * @returns Promise that resolves with HealthGoalResult based on the dictated input
   */
  private async dictateGoalRecursive(
    onDictationStop?: (transcribedText: string) => void,
    onClarificationRequested?: (clarification: string) => void,
    conversationHistory: string = ""
  ): Promise<HealthGoalResult> {
    if (!this.voiceInput) {
      throw new Error("VoiceInput component not assigned");
    }

    print("Starting speech dictation...");
    if (conversationHistory) {
      print("Using conversation history:\n" + conversationHistory);
    }

    return new Promise<HealthGoalResult>((resolve, reject) => {
      // Define the handler for voice input
      const handler = (args: { speech: string; isFinalized: boolean }) => {
        print(
          `Transcription update (finalized: ${args.isFinalized}): ${args.speech}`
        );

        // Only process finalized transcriptions
        if (args.isFinalized) {
          print(`Final transcription: ${args.speech}`);

          // Stop listening and remove handler
          this.voiceInput.removeInputHandler(handler);

          // Call the optional callback
          if (onDictationStop) {
            onDictationStop(args.speech);
          }

          // Build conversation history with USER tags
          const updatedHistory =
            conversationHistory + `<USER>${args.speech}</USER>\n`;

          // Get goal based on dictated text with conversation history
          this.getGoal(updatedHistory)
            .then((goal) => {
              // Check if model is asking for clarification
              if (goal.clarify) {
                print(`Clarification needed: ${goal.clarify}`);
                if (this.character) {
                  this.character.sayText(goal.clarify);
                }

                // Call the optional clarification callback
                if (onClarificationRequested) {
                  onClarificationRequested(goal.clarify);
                }

                // Add the model's clarification to conversation history with YOU tags
                const historyWithClarification =
                  updatedHistory + `<YOU>${JSON.stringify(goal)}</YOU>\n`;

                // Begin dictating again for clarification with updated history
                this.dictateGoalRecursive(
                  onDictationStop,
                  onClarificationRequested,
                  historyWithClarification
                )
                  .then((finalGoal) => resolve(finalGoal))
                  .catch((error) => reject(error));
              } else {
                // Goal is final, resolve with result
                resolve(goal);
              }
            })
            .catch((error) => reject(error));
        }
      };

      // Add handler and start listening
      this.voiceInput.addInputHandler(handler);
    });
  }
}
