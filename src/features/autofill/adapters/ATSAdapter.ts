import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";

// Every ATS adapter implements this interface.
// Adapters encapsulate ATS-specific form structure knowledge.
// The generic adapter covers forms not matched by any named adapter.

export interface ATSAdapter {
  readonly id: string;
  readonly displayName: string;

  // Returns true if this adapter handles the given page
  matches(url: URL, doc: Document): boolean;

  // Scans the page for all fillable fields
  detectFields(doc: Document): DetectedField[];

  // Fills a single field with a value.
  // The default implementation in AbstractAdapter handles most cases;
  // subclasses override this for ATS-specific controls.
  fillField(
    field: DetectedField,
    value: string | boolean | undefined,
    skipNonEmpty: boolean
  ): Promise<FillResult>;
}
