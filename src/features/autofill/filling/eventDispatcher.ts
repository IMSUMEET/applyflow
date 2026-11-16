// React-compatible DOM value setter and event dispatcher.
//
// React (and Vue) intercept the DOM's native value property with their own
// getter/setter. Direct `input.value = "foo"` leaves React's internal fiber
// unchanged — it still thinks the field is empty.
//
// Fix: bypass the framework's instance-level override by calling the native
// HTMLInputElement.prototype value setter directly, then fire synthetic events.
//
// Cross-realm safety: we always get the setter from the element's OWN window
// (via ownerDocument.defaultView) so the internal slot matches. This also makes
// the code work correctly in test environments where elements come from a
// secondary jsdom instance.

type AnyWindow = Window & typeof globalThis & Record<string, unknown>;

function getInputValueSetter(
  element: HTMLInputElement | HTMLTextAreaElement
): ((v: string) => void) | undefined {
  const view = element.ownerDocument?.defaultView as AnyWindow | null;
  if (!view) return undefined;

  if (element.nodeName === "TEXTAREA") {
    const proto = (view["HTMLTextAreaElement"] as typeof HTMLTextAreaElement | undefined)?.prototype;
    return Object.getOwnPropertyDescriptor(proto, "value")?.set as ((v: string) => void) | undefined;
  }
  const proto = (view["HTMLInputElement"] as typeof HTMLInputElement | undefined)?.prototype;
  return Object.getOwnPropertyDescriptor(proto, "value")?.set as ((v: string) => void) | undefined;
}

function getSelectValueSetter(
  element: HTMLSelectElement
): ((v: string) => void) | undefined {
  const view = element.ownerDocument?.defaultView as AnyWindow | null;
  if (!view) return undefined;
  const proto = (view["HTMLSelectElement"] as typeof HTMLSelectElement | undefined)?.prototype;
  return Object.getOwnPropertyDescriptor(proto, "value")?.set as ((v: string) => void) | undefined;
}

function getCheckedSetter(
  element: HTMLInputElement
): ((v: boolean) => void) | undefined {
  const view = element.ownerDocument?.defaultView as AnyWindow | null;
  if (!view) return undefined;
  const proto = (view["HTMLInputElement"] as typeof HTMLInputElement | undefined)?.prototype;
  return Object.getOwnPropertyDescriptor(proto, "checked")?.set as ((v: boolean) => void) | undefined;
}

export function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const setter = getInputValueSetter(element);
  let setterRan = false;
  if (setter) {
    try {
      setter.call(element, value);
      setterRan = true;
    } catch {
      // Cross-realm setter call failed; fall through to direct assignment
    }
  }
  // Always verify the value was set; fall back to direct assignment if needed
  if (!setterRan || element.value !== value) {
    try { element.value = value; } catch { /* can't set value */ }
  }
  try { fireChangeEvents(element); } catch { /* event dispatch failure is non-fatal */ }
}

export function setSelectValue(
  element: HTMLSelectElement,
  value: string
): boolean {
  const option = findMatchingOption(element, value);
  if (!option) return false;

  const setter = getSelectValueSetter(element);
  let setterRan = false;
  if (setter) {
    try { setter.call(element, option.value); setterRan = true; } catch { /* fall through */ }
  }
  if (!setterRan || element.value !== option.value) {
    try { element.value = option.value; } catch { /* can't set */ }
  }
  try { fireChangeEvents(element); } catch { /* non-fatal */ }
  return true;
}

export function setCheckboxValue(element: HTMLInputElement, checked: boolean): void {
  const setter = getCheckedSetter(element);
  let setterRan = false;
  if (setter) {
    try { setter.call(element, checked); setterRan = true; } catch { /* fall through */ }
  }
  if (!setterRan || element.checked !== checked) {
    try { element.checked = checked; } catch { /* can't set */ }
  }
  try { fireChangeEvents(element); } catch { /* non-fatal */ }
}

export function clickRadio(element: HTMLInputElement): void {
  if (!element.checked) {
    element.click();
    fireChangeEvents(element);
  }
}

function fireChangeEvents(element: Element): void {
  const view = element.ownerDocument?.defaultView;
  const EventCtor = view?.Event ?? Event;
  const FocusEventCtor = view?.FocusEvent ?? FocusEvent;
  element.dispatchEvent(new EventCtor("input", { bubbles: true }));
  element.dispatchEvent(new EventCtor("change", { bubbles: true }));
  element.dispatchEvent(new FocusEventCtor("blur", { bubbles: true }));
}

function findMatchingOption(
  select: HTMLSelectElement,
  desiredValue: string
): HTMLOptionElement | null {
  const desired = desiredValue.toLowerCase().trim();
  if (!desired) return null;

  // Phase 1: exact value or text match (case-insensitive)
  for (const option of select.options) {
    if (
      option.value.toLowerCase() === desired ||
      option.text.toLowerCase().trim() === desired
    ) {
      return option;
    }
  }

  // Phase 2: substring match — only if the option text is at least 3 chars
  // AND either the option text contains the desired value or vice versa.
  // The minimum length guard prevents single-char option values ("a", "1")
  // from matching any string that happens to contain that character.
  for (const option of select.options) {
    if (option.value === "" || option.value === "--") continue;
    const optText = option.text.toLowerCase().trim();
    const optValue = option.value.toLowerCase();

    // Only allow "contains" if both sides are meaningful strings (≥3 chars)
    if (optText.length >= 3 && optText.includes(desired) && desired.length >= 3) {
      return option;
    }
    if (desired.length >= 3 && desired.includes(optText) && optText.length >= 3) {
      return option;
    }
    if (optValue.length >= 3 && optValue.includes(desired) && desired.length >= 3) {
      return option;
    }
    if (desired.length >= 3 && desired.includes(optValue) && optValue.length >= 3) {
      return option;
    }
  }

  return null;
}
