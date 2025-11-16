@component
export class Marker extends BaseScriptComponent {
  @input
  @hint("Text component to display marker label")
  textField: Text;

  /**
   * Set the text displayed on this marker
   * @param text The text to display
   */
  setText(text: string): void {
    if (!this.textField) {
      print("Warning: Text field not assigned to marker");
      return;
    }

    this.textField.text = text;
  }

  /**
   * Get the current text displayed on this marker
   * @returns The current text
   */
  getText(): string {
    if (!this.textField) {
      return "";
    }

    return this.textField.text;
  }
}
