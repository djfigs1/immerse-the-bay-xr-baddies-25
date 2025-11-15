import {
  Gemini,
  GeminiLiveWebsocket,
} from "RemoteServiceGateway.lspkg/HostedExternal/Gemini";
import { GeminiTypes } from "RemoteServiceGateway.lspkg/HostedExternal/GeminiTypes";

type QueuedRequest = {
  type: "text" | "image";
  textContent?: string;
  texture?: Texture;
  promptText?: string;
  compressionQuality?: CompressionQuality;
  encodingType?: EncodingType;
  resolve: (text: string) => void;
  reject: (error: string) => void;
};

@component
export class GeminiClient extends BaseScriptComponent {
  @input
  private websocketRequirementsObj: SceneObject;

  @input
  @hint("Maximum number of requests to queue (default: 5)")
  private maxQueueSize: number = 5;

  private geminiLive: GeminiLiveWebsocket;
  ins;
  // Message queue
  private requestQueue: QueuedRequest[] = [];
  private isProcessing: boolean = false;

  // Pending response tracking
  private pendingResponses: Map<
    number,
    {
      resolve: (text: string) => void;
      reject: (error: string) => void;
      accumulatedText: string;
    }
  > = new Map();
  private nextResponseId: number = 0;

  onAwake() {
    // Create the session
    this.createSession();
  }

  /**
   * Initialize and connect to Gemini Live API
   */
  createSession(): void {
    this.websocketRequirementsObj.enabled = true;

    // Check internet connection
    const internetStatus = global.deviceInfoSystem.isInternetAvailable()
      ? "Connected"
      : "No internet";
    print("Internet status: " + internetStatus);

    // Monitor internet status changes (only on device, not in editor)d
    if (!global.deviceInfoSystem.isEditor()) {
      global.deviceInfoSystem.onInternetStatusChanged.add((args) => {
        const status = args.isInternetAvailable ? "Reconnected" : "No internet";
        print("Internet status changed: " + status);
      });
    }

    // Create websocket connection
    //this.geminiLive = Gemini.liveConnect();

    //this.setupEventHandlers();
  }

  /**
   * Setup websocket event handlers
   */
  private setupEventHandlers(): void {
    this.geminiLive.onOpen.add(() => {
      print("Gemini connection opened");
      this.sessionSetup();
    });

    this.geminiLive.onMessage.add((message) => {
      print("Received message: " + JSON.stringify(message));

      // Setup complete
      if (message.setupComplete) {
        print("Setup complete");
      }

      // Handle server content
      if (message?.serverContent) {
        const serverContent = message as GeminiTypes.Live.ServerContentEvent;

        // Text response
        if (serverContent?.serverContent?.modelTurn?.parts?.[0]?.text) {
          const text = serverContent.serverContent.modelTurn.parts[0].text;
          const completed = serverContent?.serverContent?.turnComplete || false;

          // Handle promise-based responses
          this.pendingResponses.forEach((pending, id) => {
            pending.accumulatedText += text;

            if (completed) {
              pending.resolve(pending.accumulatedText);
              this.pendingResponses.delete(id);

              // Process next item in queue
              this.processNextInQueue();
            }
          });
        }
      }

      // Handle function/tool calls
      if (message.toolCall) {
        const toolCall = message as GeminiTypes.Live.ToolCallEvent;
        toolCall.toolCall.functionCalls.forEach((functionCall) => {
          print(`Function call received: ${functionCall.name}`);
          print(`Function args: ${JSON.stringify(functionCall.args)}`);
        });
      }
    });

    this.geminiLive.onError.add((event) => {
      const errorMsg = JSON.stringify(event);
      print("Gemini error: " + errorMsg);

      // Reject all pending promises
      this.pendingResponses.forEach((pending) => {
        pending.reject(errorMsg);
      });
      this.pendingResponses.clear();

      // Reject all queued requests
      this.requestQueue.forEach((request) => {
        request.reject(errorMsg);
      });
      this.requestQueue = [];
      this.isProcessing = false;
    });

    this.geminiLive.onClose.add((event) => {
      print("Connection closed: " + event.reason);

      const errorMsg = "Connection closed: " + event.reason;

      // Reject all pending promises
      this.pendingResponses.forEach((pending) => {
        pending.reject(errorMsg);
      });
      this.pendingResponses.clear();

      // Reject all queued requests
      this.requestQueue.forEach((request) => {
        request.reject(errorMsg);
      });
      this.requestQueue = [];
      this.isProcessing = false;
    });
  }

  /**
   * Send session setup configuration
   */
  private sessionSetup(): void {
    const modelUri = "models/gemini-2.0-flash-live-preview-04-09";

    const generationConfig = {
      responseModalities: ["TEXT"],
      temperature: 1,
    } as GeminiTypes.Common.GenerationConfig;

    const sessionSetupMessage = {
      setup: {
        model: modelUri,
        generation_config: generationConfig,
      },
    } as GeminiTypes.Live.Setup;

    this.geminiLive.send(sessionSetupMessage);
  }

  /**
   * Process the next request in the queue
   */
  private processNextInQueue(): void {
    if (this.requestQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.requestQueue.shift()!;

    if (request.type === "text") {
      this.sendTextInternal(
        request.textContent!,
        request.resolve,
        request.reject
      );
    } else if (request.type === "image") {
      this.sendImageInternal(
        request.texture!,
        request.promptText,
        request.compressionQuality!,
        request.encodingType!,
        request.resolve,
        request.reject
      );
    }
  }

  /**
   * Helper method to enqueue a request
   */
  private enqueueRequest(request: QueuedRequest): Promise<string> {
    if (!this.geminiLive) {
      print("Gemini session not initialized");
      return Promise.reject("Gemini session not initialized");
    }

    return new Promise<string>((resolve, reject) => {
      // Check if queue is full
      if (this.requestQueue.length >= this.maxQueueSize) {
        print(
          `Request queue is full (max: ${this.maxQueueSize}). Request rejected.`
        );
        reject(`Request queue is full (max: ${this.maxQueueSize})`);
        return;
      }

      // Set resolve/reject on the request
      request.resolve = resolve;
      request.reject = reject;

      // Add to queue
      this.requestQueue.push(request);

      print(
        `Request queued. Queue size: ${this.requestQueue.length}/${this.maxQueueSize}`
      );

      // Process if not already processing
      if (!this.isProcessing) {
        this.processNextInQueue();
      }
    });
  }

  /**
   * Send a text message to Gemini and get a promise that resolves with the full response
   */
  public sendText(text: string): Promise<string> {
    return this.enqueueRequest({
      type: "text",
      textContent: text,
      resolve: null as any, // Will be set in enqueueRequest
      reject: null as any, // Will be set in enqueueRequest
    });
  }

  /**
   * Internal method to send text (used by queue processor)
   */
  private sendTextInternal(
    text: string,
    resolve: (text: string) => void,
    reject: (error: string) => void
  ): void {
    const responseId = this.nextResponseId++;

    this.pendingResponses.set(responseId, {
      resolve,
      reject,
      accumulatedText: "",
    });

    const message = {
      client_content: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text: text,
              },
            ],
          },
        ],
        turn_complete: true,
      },
    } as GeminiTypes.Live.ClientContent;

    this.geminiLive.send(message);
  }

  /**
   * Send image data to Gemini (encodes texture to base64) and get a promise that resolves with the full response
   * @param texture The texture to send
   * @param promptText Optional text prompt to accompany the image
   * @param compressionQuality Image compression quality (default: HighQuality)
   * @param encodingType Image encoding type (default: Jpg)
   */
  public sendImage(
    texture: Texture,
    promptText?: string,
    compressionQuality: CompressionQuality = CompressionQuality.HighQuality,
    encodingType: EncodingType = EncodingType.Jpg
  ): Promise<string> {
    return this.enqueueRequest({
      type: "image",
      texture: texture,
      promptText: promptText,
      compressionQuality: compressionQuality,
      encodingType: encodingType,
      resolve: null as any, // Will be set in enqueueRequest
      reject: null as any, // Will be set in enqueueRequest
    });
  }

  /**
   * Internal method to send image (used by queue processor)
   */
  private sendImageInternal(
    texture: Texture,
    promptText: string | undefined,
    compressionQuality: CompressionQuality,
    encodingType: EncodingType,
    resolve: (text: string) => void,
    reject: (error: string) => void
  ): void {
    const responseId = this.nextResponseId++;

    this.pendingResponses.set(responseId, {
      resolve,
      reject,
      accumulatedText: "",
    });

    print("Encoding texture to base64...");

    Base64.encodeTextureAsync(
      texture,
      (base64String) => {
        print("Texture encoded successfully!");

        const parts: any[] = [];

        // Add text prompt if provided
        if (promptText) {
          parts.push({ text: promptText });
        }

        // Add image data
        const mimeType =
          encodingType === EncodingType.Jpg ? "image/jpeg" : "image/png";
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64String,
          },
        });

        const message = {
          client_content: {
            turns: [
              {
                role: "user",
                parts: parts,
              },
            ],
            turn_complete: true,
          },
        } as GeminiTypes.Live.ClientContent;

        this.geminiLive.send(message);
        print("Sent image with mime type: " + mimeType);
      },
      () => {
        print("Image encoding failed!");
        const error = "Failed to encode texture to base64";

        // Reject the promise and process next
        this.pendingResponses.delete(responseId);
        reject(error);
        this.processNextInQueue();
      },
      compressionQuality,
      encodingType
    );
  }

  /**
   * Send realtime input (for streaming image/audio data)
   * @param data Base64 encoded media data
   * @param mimeType Media mime type
   */
  public sendRealtimeInput(data: string, mimeType: string): void {
    if (!this.geminiLive) {
      print("Gemini session not initialized");
      return;
    }

    const message = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mimeType,
            data: data,
          },
        ],
      },
    };

    this.geminiLive.send(message);
  }

  /**
   * Send a function call response back to Gemini
   */
  public sendFunctionResponse(functionName: string, response: any): void {
    const messageToSend = {
      tool_response: {
        function_responses: [
          {
            name: functionName,
            response: { content: JSON.stringify(response) },
          },
        ],
      },
    } as GeminiTypes.Live.ToolResponse;

    this.geminiLive.send(messageToSend);
  }

  /**
   * Close the Gemini connection
   */
  public closeConnection(): void {
    if (this.geminiLive) {
      // The websocket will trigger onClose event
      this.websocketRequirementsObj.enabled = false;
    }
  }
}
