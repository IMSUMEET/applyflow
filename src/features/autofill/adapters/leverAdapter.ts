// Lever ATS adapter.
// Lever applications are at jobs.lever.co/<company>/<job-id>/apply
//
// Lever uses React-controlled inputs. Fields have predictable name attributes:
//   name, email, phone, org (current company), urls[LinkedIn], urls[GitHub], etc.
// Requires React-compatible event dispatch, which the generic filler already handles.

import type { ATSAdapter } from "./ATSAdapter";
import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";
import { scanFields } from "../detection/fieldScanner";
import { fillField } from "../filling/fieldFiller";

const LEVER_HOSTNAMES = new Set(["jobs.lever.co", "hire.lever.co"]);

export class LeverAdapter implements ATSAdapter {
  readonly id = "lever";
  readonly displayName = "Lever";

  matches(url: URL, _doc: Document): boolean {
    return LEVER_HOSTNAMES.has(url.hostname);
  }

  detectFields(doc: Document): DetectedField[] {
    // Lever forms have predictable structure; the generic scanner handles them.
    // A known quirk: the "Name" field on Lever is a single full-name field.
    // The scanner will detect it; the profileResolver handles fullName.
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
