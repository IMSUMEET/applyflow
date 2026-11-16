// Workday ATS adapter.
// Handles the "Add" button flow for Work History and Education,
// fills the Skills typeahead, and fills Social Network URLs.
// Falls back to the standard field scanner for all remaining fields.

import type { ATSAdapter } from "./ATSAdapter";
import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";
import type { UserProfile, EmploymentEntry, EducationEntry } from "@/models/profile";
import { scanFields } from "../detection/fieldScanner";
import { fillField } from "../filling/fieldFiller";
import { setInputValue, setSelectValue, setCheckboxValue } from "../filling/eventDispatcher";

export class WorkdayAdapter implements ATSAdapter {
  readonly id = "workday";
  readonly displayName = "Workday";

  matches(url: URL, doc: Document): boolean {
    if (
      url.hostname.includes("myworkdayjobs.com") ||
      url.hostname.includes("workday.com")
    ) {
      return true;
    }
    // DOM-based: Workday injects data-automation-id on most interactive elements
    return (
      !!doc.querySelector("[data-automation-id]") &&
      !!(
        doc.querySelector('[data-automation-id="headlineJobTitle"]') ||
        doc.querySelector('[data-automation-id="applicationStep"]') ||
        doc.querySelector('[data-uxi-widget-type]') ||
        doc.querySelector('[data-uxi-element-id]')
      )
    );
  }

  async prepare(doc: Document, profile: UserProfile): Promise<{ filledCount: number }> {
    let filledCount = 0;

    // ── 1. Work History ────────────────────────────────────────────────────────
    for (const entry of profile.employment) {
      filledCount += await addWorkEntry(doc, entry);
      await sleep(300);
    }

    // ── 2. Education ───────────────────────────────────────────────────────────
    for (const entry of profile.education) {
      filledCount += await addEducationEntry(doc, entry);
      await sleep(300);
    }

    // ── 3. Skills typeahead ────────────────────────────────────────────────────
    if (profile.skills.length > 0) {
      filledCount += await fillSkillsTypeahead(doc, profile.skills.slice(0, 10));
    }

    // ── 4. Social URLs (LinkedIn, GitHub, etc.) ────────────────────────────────
    if (profile.linkedinUrl) {
      filledCount += fillSocialInput(doc, profile.linkedinUrl, [
        "linkedin", "linkedin url", "linkedin profile",
        "provide the url to your linkedin",
        "social network",
      ]);
    }
    if (profile.githubUrl) {
      filledCount += fillSocialInput(doc, profile.githubUrl, [
        "github", "github url", "github profile",
      ]);
    }

    return { filledCount };
  }

  detectFields(doc: Document): DetectedField[] {
    return scanFields(doc);
  }

  async fillField(
    field: DetectedField,
    value: string | boolean | undefined,
    skipNonEmpty: boolean
  ): Promise<FillResult> {
    return fillField(field, value, skipNonEmpty);
  }
}

// ── Work History ──────────────────────────────────────────────────────────────

async function addWorkEntry(doc: Document, entry: EmploymentEntry): Promise<number> {
  const addBtn = findAddButtonForSection(doc, [
    "work history",
    "employment history",
    "work experience",
    "experience",
  ]);
  if (!addBtn) return 0;

  const beforeSet = snapshotInputs(doc);
  addBtn.click();
  await sleep(700);

  const newInputs = newInputsSince(doc, beforeSet);
  if (newInputs.length === 0) return 0;

  const container = commonAncestor(newInputs) ?? doc.body;
  let filled = 0;

  filled += fillByLabel(container, doc, entry.title, [
    "job title", "title", "position", "role",
  ]);
  filled += fillByLabel(container, doc, entry.company, [
    "company", "employer", "organization", "company name",
  ]);
  if (entry.location) {
    filled += fillByLabel(container, doc, entry.location, [
      "location", "city", "city state", "work location",
    ]);
  }
  if (entry.startDate) {
    filled += fillByLabel(container, doc, toWorkdayDate(entry.startDate), [
      "from", "start date", "start month", "start",
    ]);
  }

  // "Currently working here" checkbox
  const cb = findCheckbox(container, doc, [
    "i currently work here", "currently work here", "current employer",
    "i am currently working in this role", "currently employed here",
  ]);
  if (cb) {
    setCheckboxValue(cb, entry.current ?? false);
    filled++;
    await sleep(300); // Allow To field to show/hide
  }

  if (!entry.current && entry.endDate) {
    filled += fillByLabel(container, doc, toWorkdayDate(entry.endDate), [
      "to", "end date", "end month", "through",
    ]);
  }

  if (entry.description) {
    // Workday description fields are typically textareas
    const desc = entry.description
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 5)
      .join("\n");
    filled += fillTextarea(container, doc, desc, [
      "role description", "description", "responsibilities",
      "duties", "summary", "details", "job description",
    ]);
  }

  return filled;
}

// ── Education ─────────────────────────────────────────────────────────────────

async function addEducationEntry(doc: Document, entry: EducationEntry): Promise<number> {
  const addBtn = findAddButtonForSection(doc, ["education"]);
  if (!addBtn) return 0;

  const beforeSet = snapshotInputs(doc);
  addBtn.click();
  await sleep(700);

  const newInputs = newInputsSince(doc, beforeSet);
  if (newInputs.length === 0) return 0;

  const container = commonAncestor(newInputs) ?? doc.body;
  let filled = 0;

  filled += fillByLabel(container, doc, entry.institution, [
    "school", "university", "college", "institution", "school name",
    "school university college",
  ]);

  // Degree may be a select
  filled += fillSelectByLabel(container, doc, entry.degree, [
    "degree", "degree type", "highest degree", "level of education",
    "highest level of education",
  ]);

  filled += fillByLabel(container, doc, entry.fieldOfStudy, [
    "field of study", "major", "concentration", "discipline", "area of study",
    "field major",
  ]);
  if (entry.gpa) {
    filled += fillByLabel(container, doc, entry.gpa, ["gpa", "grade point average"]);
  }
  if (entry.startDate) {
    filled += fillByLabel(container, doc, toWorkdayDate(entry.startDate), [
      "from", "start date", "start month",
    ]);
  }

  const cb = findCheckbox(container, doc, [
    "currently enrolled", "currently attending", "i currently attend",
    "currently a student",
  ]);
  if (cb) {
    setCheckboxValue(cb, entry.current ?? false);
    filled++;
    await sleep(300);
  }

  if (!entry.current && entry.endDate) {
    filled += fillByLabel(container, doc, toWorkdayDate(entry.endDate), [
      "to", "end date", "graduation date", "completion date", "end month",
    ]);
  }

  return filled;
}

// ── Skills ────────────────────────────────────────────────────────────────────

async function fillSkillsTypeahead(doc: Document, skills: string[]): Promise<number> {
  const input = findAnyTextInput(doc, [
    "type to add skills", "skills", "strengths", "add skill",
    "skill", "type to add",
  ]);
  if (!input) return 0;

  let filled = 0;
  for (const skill of skills) {
    // Set value
    setInputValue(input, skill);
    await sleep(150);

    // Confirm with Enter — common Workday pattern
    const kd = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true });
    const kp = new KeyboardEvent("keypress", { key: "Enter", keyCode: 13, bubbles: true });
    const ku = new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true });
    input.dispatchEvent(kd);
    input.dispatchEvent(kp);
    input.dispatchEvent(ku);
    await sleep(200);

    // If input was cleared, skill was accepted
    filled++;

    // Clear for next skill
    setInputValue(input, "");
    await sleep(100);
  }
  return filled;
}

// ── Social URLs ───────────────────────────────────────────────────────────────

function fillSocialInput(doc: Document, url: string, labelKeywords: string[]): number {
  const input = findAnyTextInput(doc, labelKeywords);
  if (!input) return 0;
  setInputValue(input, url);
  return 1;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function findAddButtonForSection(doc: Document, keywords: string[]): HTMLButtonElement | null {
  // Walk headings to find a section
  const headings = doc.querySelectorAll<Element>(
    "h1,h2,h3,h4,h5,[data-automation-id*='heading'],[data-automation-id*='title'],[role='heading']"
  );
  for (const h of headings) {
    const text = (h.textContent ?? "").toLowerCase();
    if (!keywords.some((kw) => text.includes(kw))) continue;

    // Walk up to find a container, then look for an Add button within it or nearby
    for (let el: Element | null = h; el; el = el.parentElement) {
      const btn = findButtonByText(el, "Add");
      if (btn) return btn;
      // Stop climbing past a certain depth
      if (el.tagName === "BODY") break;
    }

    // Check following siblings
    let sib = h.nextElementSibling;
    for (let i = 0; i < 10 && sib; i++) {
      const btn = findButtonByText(sib, "Add");
      if (btn) return btn;
      if (sib.querySelector("h1,h2,h3,h4")) break; // hit another section
      sib = sib.nextElementSibling;
    }
  }
  return null;
}

function findButtonByText(container: Element, text: string): HTMLButtonElement | null {
  for (const btn of container.querySelectorAll<HTMLButtonElement>("button")) {
    if (btn.textContent?.trim() === text && isVisible(btn)) return btn;
  }
  return null;
}

function snapshotInputs(doc: Document): Set<Element> {
  return new Set(
    doc.querySelectorAll<Element>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'
    )
  );
}

function newInputsSince(doc: Document, before: Set<Element>): Element[] {
  return Array.from(
    doc.querySelectorAll<Element>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'
    )
  ).filter((el) => !before.has(el) && isVisible(el));
}

function commonAncestor(elements: Element[]): Element | null {
  if (elements.length === 0) return null;
  let ancestor: Element | null = elements[0] ?? null;
  for (const el of elements.slice(1)) {
    while (ancestor && !ancestor.contains(el)) ancestor = ancestor.parentElement;
  }
  return ancestor;
}

function getLabelText(input: Element, doc: Document): string {
  // 1. aria-labelledby (may be space-separated ids)
  const lby = input.getAttribute("aria-labelledby");
  if (lby) {
    const text = lby
      .split(" ")
      .map((id) => doc.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    if (text) return norm(text);
  }

  // 2. label[for]
  const id = input.id;
  if (id) {
    const lbl = doc.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (lbl?.textContent) return norm(lbl.textContent);
  }

  // 3. wrapping label
  const parentLabel = input.closest("label");
  if (parentLabel?.textContent) return norm(parentLabel.textContent);

  // 4. previous element sibling
  let prev = input.previousElementSibling;
  while (prev) {
    const tag = prev.tagName;
    if (!["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) {
      const t = norm(prev.textContent ?? "");
      if (t) return t;
    }
    prev = prev.previousElementSibling;
  }

  // 5. parent container text (excluding other inputs)
  const parent = input.parentElement;
  if (parent) {
    const clone = parent.cloneNode(true) as Element;
    clone.querySelectorAll("input,textarea,select,button").forEach((e) => e.remove());
    const t = norm(clone.textContent ?? "");
    if (t && t.length < 120) return t;
  }

  return "";
}

function norm(text: string): string {
  return text
    .replace(/\s*\*+\s*/g, " ")
    .replace(/\(optional\)/gi, "")
    .replace(/\(required\)/gi, "")
    .replace(/optional\s*$/gi, "")
    .replace(/required\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();
}

function findInputInContainer(
  container: Element,
  doc: Document,
  labels: string[],
  excludeCheckbox = true
): HTMLInputElement | HTMLTextAreaElement | null {
  const selector = excludeCheckbox
    ? 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'
    : 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea';

  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const el of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)) {
      if (!isVisible(el)) continue;
      const elLabel = getLabelText(el, doc);
      if (elLabel === target || elLabel.includes(target) || target.includes(elLabel)) {
        return el;
      }
    }
  }
  return null;
}

function fillByLabel(
  container: Element,
  doc: Document,
  value: string,
  labels: string[]
): number {
  const el = findInputInContainer(container, doc, labels);
  if (!el || el.nodeName === "TEXTAREA") return 0;
  setInputValue(el as HTMLInputElement, value);
  return 1;
}

function fillTextarea(
  container: Element,
  doc: Document,
  value: string,
  labels: string[]
): number {
  // First try to find a textarea matching label
  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const ta of container.querySelectorAll<HTMLTextAreaElement>("textarea")) {
      if (!isVisible(ta)) continue;
      const taLabel = getLabelText(ta, doc);
      if (taLabel === target || taLabel.includes(target) || target.includes(taLabel)) {
        setInputValue(ta, value);
        return 1;
      }
    }
  }
  // Fallback: fill any visible textarea in the container
  const anyTa = Array.from(container.querySelectorAll<HTMLTextAreaElement>("textarea")).find(
    (ta) => isVisible(ta)
  );
  if (anyTa) {
    setInputValue(anyTa, value);
    return 1;
  }
  return 0;
}

function fillSelectByLabel(
  container: Element,
  doc: Document,
  value: string,
  labels: string[]
): number {
  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const sel of container.querySelectorAll<HTMLSelectElement>("select")) {
      if (!isVisible(sel)) continue;
      const selLabel = getLabelText(sel, doc);
      if (selLabel === target || selLabel.includes(target) || target.includes(selLabel)) {
        const ok = setSelectValue(sel, value);
        return ok ? 1 : 0;
      }
    }
  }
  return 0;
}

function findCheckbox(
  container: Element,
  doc: Document,
  labels: string[]
): HTMLInputElement | null {
  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const cb of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      if (!isVisible(cb)) continue;
      const cbLabel = getLabelText(cb, doc);
      if (cbLabel.includes(target) || target.includes(cbLabel)) return cb;
    }
  }
  return null;
}

function findAnyTextInput(doc: Document, labelKeywords: string[]): HTMLInputElement | null {
  for (const kw of labelKeywords) {
    const target = kw.toLowerCase();
    for (const input of doc.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input:not([type])'
    )) {
      if (!isVisible(input)) continue;
      const lbl = getLabelText(input, doc);
      const ph = (input.placeholder ?? "").toLowerCase();
      if (lbl.includes(target) || ph.includes(target) || target.includes(lbl)) {
        return input;
      }
    }
  }
  return null;
}

function toWorkdayDate(yyyymm: string): string {
  if (!yyyymm) return "";
  const [year, month] = yyyymm.split("-");
  if (year && month) return `${month}/${year}`;
  return yyyymm;
}

function isVisible(el: Element): boolean {
  const view = el.ownerDocument?.defaultView;
  if (!view) return true;
  try {
    const style = view.getComputedStyle(el as HTMLElement);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  } catch {
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
