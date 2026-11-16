import type { DetectedField } from "../detection/detectedField";
import type { FillResult } from "../filling/fieldFiller";
import type { UserProfile } from "@/models/profile";

// Every ATS adapter implements this interface.
// Adapters encapsulate ATS-specific form structure knowledge.
// The generic adapter covers forms not matched by any named adapter.

export interface ATSAdapter {
  readonly id: string;
  readonly displayName: string;

  // Returns true if this adapter handles the given page
  matches(url: URL, doc: Document): boolean;

  // Optional: called BEFORE detectFields(). Adapters that have dynamic forms
  // (e.g. Workday "Add" buttons for work history) expand them here and fill
  // their entries directly. Returns how many fields were filled.
  prepare?(doc: Document, profile: UserProfile): Promise<{ filledCount: number }>;

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
