export function shouldSubmitCaptureOnEnter(event: Pick<KeyboardEvent, "key" | "shiftKey" | "isComposing" | "repeat">) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing && !event.repeat;
}

export function canStartCaptureSave(note: string, saving: boolean) {
  return note.trim().length > 0 && !saving;
}
