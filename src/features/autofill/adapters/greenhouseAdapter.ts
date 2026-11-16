// Greenhouse ATS adapter.
// Greenhouse forms are at boards.greenhouse.io/<company>/jobs/<id>
// or embedded as iframes on company career pages.
//
// Greenhouse uses standard HTML inputs with predictable name/id attributes:
//   first_name, last_name, email, phone, job_application[*]
// It also has React-style controlled inputs for some newer form versions.

import type { ATSAdapter } from "./ATSAdapter";
import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";
import { scanFields } from "../detection/fieldScanner";
import { fillField } from "../filling/fieldFiller";

const GREENHOUSE_HOSTNAMES = new Set(["boards.greenhouse.io", "job-boards.greenhouse.io"]);

export class GreenhouseAdapter implements ATSAdapter {
  readonly id = "greenhouse";
  readonly displayName = "Greenhouse";

  matches(url: URL, _doc: Document): boolean {
    // Direct Greenhouse board
    if (GREENHOUSE_HOSTNAMES.has(url.hostname)) return true;
    // Embedded form detection: look for Greenhouse-specific DOM markers
    return false;
  }

  detectFields(doc: Document): DetectedField[] {
    // Greenhouse uses a standard form — the generic scanner handles it well.
    // We could add Greenhouse-specific overrides here (e.g. the EEOC section),
    // but for now the generic scanner gives good results.
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
