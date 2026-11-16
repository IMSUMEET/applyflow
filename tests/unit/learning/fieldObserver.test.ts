import { describe, it, expect, vi, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { startFieldObserver } from "@/features/learning/fieldObserver";
import type { DetectedField, FieldSignals } from "@/features/autofill/detection/detectedField";

function makeSignals(label: string): FieldSignals {
  return {
    label,
    name: "",
    fieldId: "",
    placeholder: "",
    ariaLabel: "",
    nearbyText: "",
    inputType: "text",
  };
}

function makeTextField(label: string, dom: JSDOM): DetectedField {
  const input = dom.window.document.createElement("input");
  input.type = "text";
  dom.window.document.body.appendChild(input);
  return {
    uid: "uid-1",
    element: input as unknown as HTMLElement,
    elementType: "input-text",
    signals: makeSignals(label),
    canonicalField: null,
    confidence: 0,
    matchReasons: [],
    currentValue: "",
    isEmpty: true,
  };
}

function makeSelectField(label: string, dom: JSDOM): DetectedField {
  const select = dom.window.document.createElement("select");
  const opt = dom.window.document.createElement("option");
  opt.value = "yes";
  opt.textContent = "Yes";
  select.appendChild(opt);
  dom.window.document.body.appendChild(select);
  return {
    uid: "uid-2",
    element: select as unknown as HTMLElement,
    elementType: "select",
    signals: makeSignals(label),
    canonicalField: null,
    confidence: 0,
    matchReasons: [],
    currentValue: "",
    isEmpty: true,
  };
}

function makeRadioGroup(label: string, dom: JSDOM): DetectedField {
  const doc = dom.window.document;
  const r1 = doc.createElement("input") as HTMLInputElement;
  r1.type = "radio";
  r1.name = "sponsorship";
  r1.value = "No";
  const r2 = doc.createElement("input") as HTMLInputElement;
  r2.type = "radio";
  r2.name = "sponsorship";
  r2.value = "Yes";
  doc.body.appendChild(r1);
  doc.body.appendChild(r2);
  return {
    uid: "uid-3",
    element: r1.parentElement as unknown as HTMLElement ?? r1 as unknown as HTMLElement,
    elements: [r1, r2] as unknown as HTMLInputElement[],
    elementType: "radio-group",
    signals: makeSignals(label),
    canonicalField: null,
    confidence: 0,
    matchReasons: [],
    currentValue: "",
    isEmpty: true,
  };
}

describe("startFieldObserver", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><body></body></html>");
  });

  it("calls callback with question + answer when text field blurs with a value", () => {
    const field = makeTextField("Years of DevOps experience", dom);
    const cb = vi.fn();
    startFieldObserver([field], cb);

    const input = field.element as HTMLInputElement;
    input.value = "4 years";
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Years of DevOps experience",
        answer: "4 years",
      })
    );
  });

  it("does not call callback when field is empty on blur", () => {
    const field = makeTextField("Some question", dom);
    const cb = vi.fn();
    startFieldObserver([field], cb);

    const input = field.element as HTMLInputElement;
    input.value = "";
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).not.toHaveBeenCalled();
  });

  it("calls callback on select change with the option text", () => {
    const field = makeSelectField("Do you need sponsorship?", dom);
    const cb = vi.fn();
    startFieldObserver([field], cb);

    const select = field.element as HTMLSelectElement;
    select.selectedIndex = 0;
    select.dispatchEvent(new dom.window.Event("change"));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Do you need sponsorship?",
        answer: "Yes",
      })
    );
  });

  it("calls callback on radio change", () => {
    const field = makeRadioGroup("Requires sponsorship", dom);
    const cb = vi.fn();
    startFieldObserver([field], cb);

    const [r1] = field.elements!;
    (r1 as unknown as HTMLInputElement).checked = true;
    (r1 as unknown as HTMLInputElement).dispatchEvent(new dom.window.Event("change"));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Requires sponsorship",
        answer: "No",
      })
    );
  });

  it("skips fields with no question label", () => {
    const field = makeTextField("", dom);
    const cb = vi.fn();
    startFieldObserver([field], cb);

    const input = field.element as HTMLInputElement;
    input.value = "some answer";
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).not.toHaveBeenCalled();
  });

  it("cleanup function removes listeners", () => {
    const field = makeTextField("DevOps years", dom);
    const cb = vi.fn();
    const cleanup = startFieldObserver([field], cb);
    cleanup();

    const input = field.element as HTMLInputElement;
    input.value = "3 years";
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).not.toHaveBeenCalled();
  });
});
