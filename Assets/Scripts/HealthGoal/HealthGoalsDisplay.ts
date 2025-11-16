@component
export class HealthGoalsDisplay extends BaseScriptComponent {
  @input
  @hint("Text component to display messages")
  private textComponent: Text;

  /**
   * Set the display text
   * @param text The text to display
   */
  public setText(text: string): void {
    if (!this.textComponent) {
      print("Warning: Text component not assigned to HealthGoalsDisplay");
      return;
    }

    this.textComponent.text = text;
    print(`Display updated: ${text}`);
  }

  /**
   * Clear the display text
   */
  public clearText(): void {
    this.setText("");
  }
}
