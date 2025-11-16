export async function delay(component: BaseScriptComponent, seconds: number) {
  return await new Promise<void>((resolve) => {
    const event = component.createEvent(
      "DelayedCallbackEvent"
    ) as DelayedCallbackEvent;
    event.bind(() => resolve());
    event.reset(seconds);
  });
}
