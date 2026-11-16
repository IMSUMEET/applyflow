// Static data for profile selects — countries, US/CA states, work auth, degrees, etc.

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "India",
  "Germany",
  "France",
  "Netherlands",
  "Singapore",
  "Ireland",
  "New Zealand",
  "Sweden",
  "Switzerland",
  "Denmark",
  "Norway",
  "Finland",
  "Austria",
  "Belgium",
  "Spain",
  "Italy",
  "Portugal",
  "Poland",
  "Brazil",
  "Mexico",
  "Argentina",
  "Japan",
  "South Korea",
  "China",
  "Hong Kong",
  "Taiwan",
  "Israel",
  "United Arab Emirates",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Other",
] as const;

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "Washington D.C.",
};

export const CA_PROVINCES: Record<string, string> = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba",
  NB: "New Brunswick", NL: "Newfoundland and Labrador",
  NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut",
  ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
  SK: "Saskatchewan", YT: "Yukon",
};

export const UK_REGIONS = [
  "England", "Scotland", "Wales", "Northern Ireland",
];

export const AU_STATES: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "Australian Capital Territory", NT: "Northern Territory",
};

export function getStatesForCountry(
  country: string
): Array<{ code: string; name: string }> | null {
  if (country === "United States") {
    return Object.entries(US_STATES).map(([code, name]) => ({ code, name }));
  }
  if (country === "Canada") {
    return Object.entries(CA_PROVINCES).map(([code, name]) => ({ code, name }));
  }
  if (country === "Australia") {
    return Object.entries(AU_STATES).map(([code, name]) => ({ code, name }));
  }
  if (country === "United Kingdom") {
    return UK_REGIONS.map((name) => ({ code: name, name }));
  }
  return null; // free text for all other countries
}

export const WORK_AUTHORIZATION_OPTIONS = [
  { value: "US Citizen", label: "US Citizen" },
  { value: "Permanent Resident", label: "Permanent Resident (Green Card)" },
  { value: "H-1B", label: "H-1B Visa" },
  { value: "H-1B Transfer", label: "H-1B Transfer" },
  { value: "OPT", label: "F-1 OPT" },
  { value: "STEM OPT", label: "F-1 STEM OPT Extension" },
  { value: "CPT", label: "F-1 CPT" },
  { value: "TN Visa", label: "TN Visa (Canada/Mexico)" },
  { value: "E-3 Visa", label: "E-3 Visa (Australia)" },
  { value: "L-1 Visa", label: "L-1 Visa (Intracompany Transfer)" },
  { value: "O-1 Visa", label: "O-1 Visa (Extraordinary Ability)" },
  { value: "EAD", label: "EAD (Employment Authorization Document)" },
  { value: "Other", label: "Other Work Authorization" },
  { value: "Not Authorized", label: "Not Authorized to Work in US" },
];

export const DEGREE_OPTIONS = [
  "High School Diploma / GED",
  "Associate's Degree (AA / AS)",
  "Bachelor's Degree (BA / BS)",
  "Master's Degree (MA / MS / MBA)",
  "Doctoral Degree (PhD / EdD)",
  "Professional Degree (JD / MD)",
  "Postdoctoral",
  "Certificate / Certification",
  "Bootcamp / Nanodegree",
  "Other",
];

export const EMPLOYMENT_TYPE_OPTIONS: Array<{
  value: "full-time" | "part-time" | "contract" | "internship" | "freelance";
  label: string;
}> = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance / Consulting" },
];

export const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function getYearOptions(startYear = 1970): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= startYear; y--) years.push(y);
  return years;
}

// Parse "YYYY-MM" → { month: "MM", year: "YYYY" }
export function parseDateParts(date: string): { month: string; year: string } {
  if (!date) return { month: "", year: "" };
  const [year = "", month = ""] = date.split("-");
  return { month, year };
}

// Build "YYYY-MM" from parts
export function buildDate(year: string, month: string): string {
  if (!year) return "";
  if (!month) return year;
  return `${year}-${month}`;
}
