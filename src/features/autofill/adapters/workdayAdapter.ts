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
    try {
      // ── 1. Work History ──────────────────────────────────────────────────────
      for (const entry of profile.employment) {
        try {
          // Always pick the FIRST "Add" button in the Work History section
          const btn = findAddButtonNear(doc, ["work history", "employment history", "work experience", "experience"]);
          if (!btn) {
            console.warn("[ApplyFlow] Workday: no Work History Add button found");
            break;
          }
          console.log("[ApplyFlow] Workday: adding work entry for", entry.company);
          filledCount += await addWorkEntry(doc, btn, entry);
        } catch (e) {
          console.error("[ApplyFlow] Workday: work entry error", e);
        }
        await sleep(400);
      }

      // ── 2. Education ─────────────────────────────────────────────────────────
      for (const entry of profile.education) {
        try {
          const btn = findAddButtonNear(doc, ["education"]);
          if (!btn) {
            console.warn("[ApplyFlow] Workday: no Education Add button found");
            break;
          }
          console.log("[ApplyFlow] Workday: adding education entry for", entry.institution);
          filledCount += await addEducationEntry(doc, btn, entry);
        } catch (e) {
          console.error("[ApplyFlow] Workday: education entry error", e);
        }
        await sleep(400);
      }

      // ── 3. Skills typeahead ──────────────────────────────────────────────────
      if (profile.skills.length > 0) {
        try {
          filledCount += await fillSkillsTypeahead(doc, profile.skills.slice(0, 10));
        } catch { /* non-fatal */ }
      }

      // ── 4. Social URLs ───────────────────────────────────────────────────────
      filledCount += fillSocialInput(doc, profile.linkedinUrl, [
        "linkedin", "linkedin url", "linkedin profile",
        "provide the url to your linkedin",
        "your linkedin profile",
        "linkedin.com",
        "social network",
      ]);
      if (profile.githubUrl) {
        filledCount += fillSocialInput(doc, profile.githubUrl, [
          "github", "github url", "github profile",
        ]);
      }
    } catch (e) {
      console.error("[ApplyFlow] Workday prepare error", e);
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

// ── Core: find the Add button near a section heading ─────────────────────────
//
// Strategy: collect every visible button whose text is "Add", then for each
// one walk UP its ancestor chain looking for an element whose text content
// includes one of the keywords. The shallowest (closest) match wins.
// Last resort: return the FIRST "Add" button on the page.
//
function findAddButtonNear(
  doc: Document,
  keywords: string[]
): HTMLButtonElement | null {
  const candidates = collectAddButtons(doc);
  if (candidates.length === 0) {
    console.warn("[ApplyFlow] Workday: zero buttons with text 'Add' on page");
    return null;
  }

  for (const btn of candidates) {
    // Walk UP ancestors; find the shallowest one that contains a keyword
    for (
      let el: Element | null = btn.parentElement;
      el && el.tagName !== "BODY";
      el = el.parentElement
    ) {
      const text = (el.textContent ?? "").toLowerCase();
      if (keywords.some((kw) => text.includes(kw))) {
        // Don't match if the element is too large (whole-page container)
        const childCount = el.children.length + el.querySelectorAll("*").length;
        if (childCount < 300) {
          return btn;
        }
      }
    }
  }

  // Fallback: return the first Add button (Work History) or the
  // one closest by DOM position to a matching heading.
  console.warn("[ApplyFlow] Workday: falling back to first Add button for keywords", keywords);
  return candidates[0] ?? null;
}

function collectAddButtons(doc: Document): HTMLButtonElement[] {
  const result: HTMLButtonElement[] = [];
  for (const el of doc.querySelectorAll<HTMLButtonElement>("button")) {
    // Strip any SVG/icon text — just get the text node content
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.trim() ?? "")
      .join("")
      .trim();

    const full = el.textContent?.trim() ?? "";

    // Accept "Add", "+ Add", " Add ", any capitalisation
    if (
      text.toLowerCase() === "add" ||
      full.toLowerCase() === "add" ||
      full.toLowerCase() === "+ add"
    ) {
      result.push(el);
    }
  }
  return result;
}

// ── Work History entry ────────────────────────────────────────────────────────

async function addWorkEntry(
  doc: Document,
  addBtn: HTMLButtonElement,
  entry: EmploymentEntry
): Promise<number> {
  const beforeSet = snapshotInputs(doc);
  addBtn.click();
  await sleep(800);

  const newInputs = newInputsSince(doc, beforeSet);
  if (newInputs.length === 0) {
    console.warn("[ApplyFlow] Workday: no new inputs appeared after Work History Add click");
    return 0;
  }

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

  const cb = findCheckbox(container, doc, [
    "i currently work here", "currently work here",
    "i am currently working in this role",
    "currently employed here", "current",
  ]);
  if (cb) {
    setCheckboxValue(cb, entry.current ?? false);
    filled++;
    await sleep(300);
  }

  if (!entry.current && entry.endDate) {
    filled += fillByLabel(container, doc, toWorkdayDate(entry.endDate), [
      "to", "end date", "end month", "through",
    ]);
  }

  if (entry.description) {
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

// ── Education entry ───────────────────────────────────────────────────────────

async function addEducationEntry(
  doc: Document,
  addBtn: HTMLButtonElement,
  entry: EducationEntry
): Promise<number> {
  const beforeSet = snapshotInputs(doc);
  addBtn.click();
  await sleep(800);

  const newInputs = newInputsSince(doc, beforeSet);
  if (newInputs.length === 0) {
    console.warn("[ApplyFlow] Workday: no new inputs appeared after Education Add click");
    return 0;
  }

  const container = commonAncestor(newInputs) ?? doc.body;
  let filled = 0;

  filled += fillByLabel(container, doc, entry.institution, [
    "school", "university", "college", "institution", "school name",
  ]);
  filled += fillSelectByLabel(container, doc, entry.degree, [
    "degree", "degree type", "highest degree", "level of education",
  ]);
  filled += fillByLabel(container, doc, entry.fieldOfStudy, [
    "field of study", "major", "concentration", "discipline", "area of study",
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
    "currently enrolled", "currently attending",
    "i currently attend", "currently a student",
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
    setInputValue(input, skill);
    await sleep(150);
    const kd = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true });
    const kp = new KeyboardEvent("keypress", { key: "Enter", keyCode: 13, bubbles: true });
    const ku = new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true });
    input.dispatchEvent(kd);
    input.dispatchEvent(kp);
    input.dispatchEvent(ku);
    await sleep(200);
    filled++;
    setInputValue(input, "");
    await sleep(100);
  }
  return filled;
}

// ── Social URLs ───────────────────────────────────────────────────────────────

function fillSocialInput(doc: Document, url: string, labelKeywords: string[]): number {
  if (!url) return 0;
  const input = findAnyTextInput(doc, labelKeywords);
  if (!input) return 0;
  setInputValue(input, url);
  return 1;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

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
  ).filter((el) => !before.has(el));
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
  const lby = input.getAttribute("aria-labelledby");
  if (lby) {
    const text = lby
      .split(" ")
      .map((id) => doc.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    if (text) return normLabel(text);
  }
  const id = input.id;
  if (id) {
    const lbl = doc.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (lbl?.textContent) return normLabel(lbl.textContent);
  }
  const parentLabel = input.closest("label");
  if (parentLabel?.textContent) return normLabel(parentLabel.textContent);

  let prev = input.previousElementSibling;
  while (prev) {
    const tag = prev.tagName;
    if (!["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) {
      const t = normLabel(prev.textContent ?? "");
      if (t) return t;
    }
    prev = prev.previousElementSibling;
  }
  const parent = input.parentElement;
  if (parent) {
    const clone = parent.cloneNode(true) as Element;
    clone.querySelectorAll("input,textarea,select,button").forEach((e) => e.remove());
    const t = normLabel(clone.textContent ?? "");
    if (t && t.length < 120) return t;
  }
  return "";
}

function normLabel(text: string): string {
  return text
    .replace(/\s*\*+\s*/g, " ")
    .replace(/\(optional\)/gi, "")
    .replace(/\(required\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();
}

function findInputInContainer(
  container: Element,
  doc: Document,
  labels: string[]
): HTMLInputElement | HTMLTextAreaElement | null {
  const selector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea';
  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const el of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)) {
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
  for (const lbl of labels) {
    const target = lbl.toLowerCase();
    for (const ta of container.querySelectorAll<HTMLTextAreaElement>("textarea")) {
      const taLabel = getLabelText(ta, doc);
      if (taLabel === target || taLabel.includes(target) || target.includes(taLabel)) {
        setInputValue(ta, value);
        return 1;
      }
    }
  }
  const anyTa = container.querySelector<HTMLTextAreaElement>("textarea");
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
      const selLabel = getLabelText(sel, doc);
      if (selLabel === target || selLabel.includes(target) || target.includes(selLabel)) {
        return setSelectValue(sel, value) ? 1 : 0;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
