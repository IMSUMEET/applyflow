// Generic HTML form adapter — handles any standard web form.
// Works on forms that aren't covered by a named ATS adapter.

import type { ATSAdapter } from "./ATSAdapter";
import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";
import { scanFields } from "../detection/fieldScanner";
import { fillField } from "../filling/fieldFiller";

export class GenericAdapter implements ATSAdapter {
  readonly id = "generic";
  readonly displayName = "Generic HTML Form";

  matches(_url: URL, _doc: Document): boolean {
    // Matches everything — always the last-resort adapter
    return true;
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
