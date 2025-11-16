import { SecretsManager } from "../Secrets/SecretsManager";

@component
export class GeminiRestClient extends BaseScriptComponent {
  @input
  private remoteServiceModule: RemoteServiceModule;

  @input
  private internetModule: InternetModule;

  @input
  @hint("Gemini model to use (default: gemini-2.0-flash-exp)")
  private model: string = "gemini-2.0-flash-exp";

  private apiKey: string = "";
  private imageQuality = CompressionQuality.HighQuality;
  private imageEncoding = EncodingType.Jpg;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.initialize.bind(this));
  }

  /**
   * Initialize the Gemini REST client
   */
  private initialize(): void {
    // Load API key from secrets
    this.apiKey = SecretsManager.getSecret("geminiKey") || "";

    if (!this.apiKey) {
      print("Error: Gemini API key not found in secrets");
      return;
    }

    // Check internet connection
    const internetStatus = global.deviceInfoSystem.isInternetAvailable()
      ? "Connected"
      : "No internet";
    print("Gemini REST client initialized. Internet status: " + internetStatus);

    // Monitor internet status changes (only on device, not in editor)
    if (!global.deviceInfoSystem.isEditor()) {
      global.deviceInfoSystem.onInternetStatusChanged.add((args) => {
        const status = args.isInternetAvailable ? "Reconnected" : "No internet";
        print("Internet status changed: " + status);
      });
    }
  }

  /**
   * Send a text message to Gemini and get a promise that resolves with the full response
   */
  public async sendText(text: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not set");
    }

    const requestBody = {
      contents: [
        {
          parts: [{ text: text }],
        },
      ],
    };

    const webRequest = new Request(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const response = await this.internetModule.fetch(webRequest);

    if (response.status === 200) {
      const bodyText = await response.text();
      const bodyJson = JSON.parse(bodyText);

      if (
        bodyJson.candidates?.[0]?.content?.parts?.[0]?.text &&
        bodyJson.candidates[0].content.parts[0].text.length > 0
      ) {
        return bodyJson.candidates[0].content.parts[0].text.replaceAll(
          "\\",
          ""
        );
      } else {
        throw new Error("No text in response");
      }
    } else {
      throw new Error(`HTTP error: ${response.status}`);
    }
  }

  /**
   * Send image data to Gemini (encodes texture to base64) and get a promise that resolves with the full response
   * @param texture The texture to send
   * @param promptText Optional text prompt to accompany the image
   * @param compressionQuality Quality of image compression (default: HighQuality)
   * @param encodingType Image encoding type (default: Jpg)
   */
  public async sendImage(
    texture: Texture,
    promptText?: string,
    compressionQuality?: CompressionQuality,
    encodingType?: EncodingType
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not set");
    }

    print("Encoding image to base64...");

    // Encode image to base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      Base64.encodeTextureAsync(
        texture,
        (base64String) => {
          print("Image encoding success!");
          resolve(base64String);
        },
        () => {
          print("Image encoding failed!");
          reject(new Error("Image encoding failed"));
        },
        compressionQuality || this.imageQuality,
        encodingType || this.imageEncoding
      );
    });

    // Send to Gemini API
    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText || "" },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const webRequest = new Request(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    print("Sending image request to Gemini...");
    const response = await this.internetModule.fetch(webRequest);

    if (response.status === 200) {
      const bodyText = await response.text();
      print("Response received: " + bodyText);
      const bodyJson = JSON.parse(bodyText);

      if (
        bodyJson.candidates?.[0]?.content?.parts?.[0]?.text &&
        bodyJson.candidates[0].content.parts[0].text.length > 0
      ) {
        return bodyJson.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No text in response");
      }
    } else {
      print("MAKE SURE YOUR API KEY IS SET IN SECRETS!");
      throw new Error(`HTTP error: ${response.status}`);
    }
  }
}
