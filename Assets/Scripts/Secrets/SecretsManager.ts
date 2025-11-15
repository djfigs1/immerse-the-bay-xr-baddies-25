import { RemoteServiceGatewayCredentials } from "RemoteServiceGateway.lspkg/RemoteServiceGatewayCredentials";

export type SecretsConfig = {
  gemini?: string;
};

@component
export class SecretsManager extends BaseScriptComponent {
  @input
  remoteServiceCredentials: RemoteServiceGatewayCredentials;

  private static config: SecretsConfig | null = null;

  /**
   * Static method to load secrets from the secrets module
   * Attempts to require the module and extract the default export
   */
  static loadConfig(): SecretsConfig | null {
    if (SecretsManager.config) {
      return SecretsManager.config;
    }

    try {
      // Require the secrets module
      const secretsModule = require("./SECRETS") as { default?: SecretsConfig };

      if (secretsModule && secretsModule.default) {
        SecretsManager.config = secretsModule.default;
        print("Secrets loaded successfully!");
        print("Config: " + JSON.stringify(SecretsManager.config));
        return SecretsManager.config;
      } else {
        print("Warning: Secrets module found but no default export");
        return null;
      }
    } catch (error) {
      print("Error loading secrets module: " + error);
      print(
        "Make sure you have a SECRETS.ts file with a default export of type SecretsConfig"
      );
      return null;
    }
  }

  /**
   * Get a specific secret by key
   */
  static getSecret(key: keyof SecretsConfig): string | undefined {
    const config = SecretsManager.loadConfig();
    return config ? config[key] : undefined;
  }

  onAwake() {
    this.loadSecrets();
  }

  private loadSecrets() {
    // Load the config using the static method
    const config = SecretsManager.loadConfig();

    this.remoteServiceCredentials.googleToken = config?.gemini || "";

    if (config) {
      print("Secrets loaded in component:");
      print("  - Gemini API Key: " + (config.gemini ? "✓ Set" : "✗ Not set"));
    }
  }
}
