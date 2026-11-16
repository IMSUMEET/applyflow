// Selects the most specific ATS adapter for the current page.
// Adapters are tested in priority order; the first match wins.
// GenericAdapter is last and always matches.

import type { ATSAdapter } from "./ATSAdapter";
import { GreenhouseAdapter } from "./greenhouseAdapter";
import { LeverAdapter } from "./leverAdapter";
import { WorkdayAdapter } from "./workdayAdapter";
import { GenericAdapter } from "./genericAdapter";

const ADAPTERS: ATSAdapter[] = [
  new GreenhouseAdapter(),
  new LeverAdapter(),
  new WorkdayAdapter(),
  new GenericAdapter(),
];

export function selectAdapter(url: URL, doc: Document): ATSAdapter {
  for (const adapter of ADAPTERS) {
    if (adapter.matches(url, doc)) return adapter;
  }
  // Should never be reached — GenericAdapter always matches
  return new GenericAdapter();
}

export function getAdapterById(id: string): ATSAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}
