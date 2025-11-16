let voiceOptions = VoiceML.ListeningOptions.create();
voiceOptions.speechRecognizer = VoiceMLModule.SpeechRecognizer.Default;
voiceOptions.languageCode = "en_US";

export type PromptHandler = (prompt: string) => void;

export type InputHandler = (args: {
  speech: string;
  isFinalized: boolean;
}) => void;

@component
export class VoiceInput extends BaseScriptComponent {
  @input
  voiceInterface!: VoiceMLModule;

  private inputHandlers: InputHandler[] = [];

  async onAwake() {
    // Bind the onStart event
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart();
    });
  }

  async onStart() {
    this.voiceInterface.onListeningEnabled.add(() => {
      this.startListening();
      print("Voice Input Enabled");
    });

    this.voiceInterface.onListeningUpdate.add(
      this.onNewTranscription.bind(this)
    );
  }

  public startListening() {
    this.voiceInterface.startListening(voiceOptions);
  }

  public stopListening() {
    this.voiceInterface.stopListening();
  }

  public addInputHandler(handler: InputHandler) {
    this.inputHandlers.push(handler);
  }

  public removeInputHandler(handler: InputHandler) {
    const index = this.inputHandlers.indexOf(handler);
    if (index > -1) {
      this.inputHandlers.splice(index, 1);
    }
  }

  private async onNewTranscription(
    eventArgs: VoiceML.ListeningUpdateEventArgs
  ) {
    if (eventArgs.transcription.length == 0) return;

    print("New Voice Input: " + eventArgs.transcription);

    const inputArgs = {
      speech: eventArgs.transcription,
      isFinalized: eventArgs.isFinalTranscription,
    };

    // Invoke all registered input handlers
    for (const handler of this.inputHandlers) {
      handler(inputArgs);
    }
  }
}
