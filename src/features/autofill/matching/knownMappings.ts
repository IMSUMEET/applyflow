import type { CanonicalField } from "../canonicalFields";

// A mapping entry describes one canonical field and all the textual clues
// that point to it. `patterns` are tested against normalized label / name /
// id / placeholder / aria-label text. `typeHint` is the raw HTML input type.
//
// Confidence weights:
//   label exact match  → +0.45
//   name/id exact      → +0.40
//   placeholder exact  → +0.30
//   typeHint match     → +0.35
//   any "contains"     → +0.20 per signal (capped)
// Final score is clamped to [0, 1].

export interface FieldMappingEntry {
  field: CanonicalField;
  // Exact normalized strings that identify this field
  exactPatterns: string[];
  // Substrings that increase confidence if present
  containsPatterns: string[];
  // Negative patterns — if any of these match, subtract 0.3 (reduces false positives)
  negativePatterns?: string[];
  // Raw HTML input type (pre-normalization) that hints at this field
  typeHint?: string;
}

export const FIELD_MAPPINGS: FieldMappingEntry[] = [
  // ── Personal ────────────────────────────────────────────────────────────────
  {
    field: "firstName",
    exactPatterns: [
      "first name",
      "first",
      "firstname",
      "fname",
      "given name",
      "givenname",
      "forename",
    ],
    containsPatterns: ["first name", "given name", "first"],
    negativePatterns: ["last", "middle", "confirm"],
  },
  {
    field: "lastName",
    exactPatterns: [
      "last name",
      "last",
      "lastname",
      "lname",
      "surname",
      "family name",
      "familyname",
    ],
    containsPatterns: ["last name", "surname", "family name"],
    negativePatterns: ["first", "middle"],
  },
  {
    field: "middleName",
    exactPatterns: ["middle name", "middle", "middlename", "middle initial"],
    containsPatterns: ["middle name", "middle initial"],
  },
  {
    field: "preferredName",
    exactPatterns: ["preferred name", "preferred first name", "nickname", "goes by"],
    containsPatterns: ["preferred name", "preferred first"],
  },
  {
    field: "fullName",
    exactPatterns: ["full name", "fullname", "name", "your name", "applicant name", "legal name"],
    containsPatterns: ["full name"],
    negativePatterns: ["first", "last", "middle", "company", "school", "university"],
  },
  {
    field: "email",
    exactPatterns: [
      "email",
      "email address",
      "e mail",
      "e-mail",
      "work email",
      "personal email",
      "emailaddress",
    ],
    containsPatterns: ["email"],
    typeHint: "email",
    negativePatterns: ["confirm", "verify"],
  },
  {
    field: "phone",
    exactPatterns: [
      "phone",
      "phone number",
      "phonenumber",
      "mobile",
      "mobile number",
      "cell",
      "cell phone",
      "telephone",
      "contact number",
    ],
    containsPatterns: ["phone", "mobile", "telephone", "cell"],
    typeHint: "tel",
  },

  // ── Location ─────────────────────────────────────────────────────────────────
  {
    field: "city",
    exactPatterns: ["city", "town", "municipality", "city of residence"],
    containsPatterns: ["city"],
    negativePatterns: ["state", "country", "postal", "zip"],
  },
  {
    field: "state",
    exactPatterns: [
      "state",
      "province",
      "state province",
      "state or province",
      "region",
    ],
    containsPatterns: ["state", "province"],
    negativePatterns: ["country", "city"],
  },
  {
    field: "country",
    exactPatterns: [
      "country",
      "country of residence",
      "country of citizenship",
      "nation",
    ],
    containsPatterns: ["country"],
  },
  {
    field: "postalCode",
    exactPatterns: [
      "zip",
      "zip code",
      "zipcode",
      "postal code",
      "postalcode",
      "postcode",
    ],
    containsPatterns: ["zip", "postal code", "postcode"],
  },
  {
    field: "fullAddress",
    exactPatterns: ["address", "mailing address", "home address", "current address"],
    containsPatterns: ["address"],
    negativePatterns: ["city", "state", "zip", "country", "street"],
  },
  {
    field: "streetAddress",
    exactPatterns: [
      "street address",
      "street",
      "address line 1",
      "address1",
      "street line",
    ],
    containsPatterns: ["street address", "address line 1"],
  },

  // ── Professional links ────────────────────────────────────────────────────────
  {
    field: "linkedinUrl",
    exactPatterns: [
      "linkedin",
      "linkedin url",
      "linkedin profile",
      "linkedin profile url",
      "linkedin com",
    ],
    containsPatterns: ["linkedin"],
    typeHint: "url",
  },
  {
    field: "githubUrl",
    exactPatterns: [
      "github",
      "github url",
      "github profile",
      "github com",
      "git hub",
    ],
    containsPatterns: ["github"],
    typeHint: "url",
  },
  {
    field: "portfolioUrl",
    exactPatterns: [
      "portfolio",
      "portfolio url",
      "portfolio website",
      "personal portfolio",
      "work samples",
    ],
    containsPatterns: ["portfolio"],
  },
  {
    field: "websiteUrl",
    exactPatterns: [
      "website",
      "personal website",
      "website url",
      "personal site",
      "web site",
      "homepage",
    ],
    containsPatterns: ["website", "personal site"],
    negativePatterns: ["linkedin", "github", "portfolio"],
  },

  // ── Professional ──────────────────────────────────────────────────────────────
  {
    field: "summary",
    exactPatterns: [
      "summary",
      "professional summary",
      "bio",
      "about",
      "about me",
      "cover letter",
      "personal statement",
      "objective",
    ],
    containsPatterns: ["summary", "about me", "cover letter"],
  },
  {
    field: "yearsOfExperience",
    exactPatterns: [
      "years of experience",
      "years experience",
      "total experience",
      "work experience years",
    ],
    containsPatterns: ["years of experience", "years experience"],
  },

  // ── Education ─────────────────────────────────────────────────────────────────
  {
    field: "school",
    exactPatterns: [
      "school",
      "university",
      "college",
      "institution",
      "school name",
      "university name",
      "alma mater",
    ],
    containsPatterns: ["university", "college", "school", "institution"],
    negativePatterns: ["degree", "major", "gpa"],
  },
  {
    field: "degree",
    exactPatterns: [
      "degree",
      "degree type",
      "highest degree",
      "highest level of education",
      "education level",
      "qualification",
    ],
    containsPatterns: ["degree", "education level"],
    negativePatterns: ["school", "university"],
  },
  {
    field: "major",
    exactPatterns: [
      "major",
      "field of study",
      "fieldofstudy",
      "area of study",
      "concentration",
      "discipline",
    ],
    containsPatterns: ["major", "field of study", "area of study"],
  },
  {
    field: "graduationYear",
    exactPatterns: [
      "graduation year",
      "graduation date",
      "expected graduation",
      "grad year",
      "completion date",
    ],
    containsPatterns: ["graduation", "grad year"],
    negativePatterns: ["start"],
  },
  {
    field: "gpa",
    exactPatterns: ["gpa", "grade point average", "cumulative gpa", "overall gpa"],
    containsPatterns: ["gpa", "grade point"],
  },

  // ── Employment ────────────────────────────────────────────────────────────────
  {
    field: "currentCompany",
    exactPatterns: [
      "current company",
      "current employer",
      "employer",
      "company",
      "organization",
      "employer name",
    ],
    containsPatterns: ["current company", "current employer", "employer"],
    negativePatterns: ["school", "university", "job title", "position"],
  },
  {
    field: "currentTitle",
    exactPatterns: [
      "current title",
      "current position",
      "job title",
      "position",
      "title",
      "role",
      "current role",
    ],
    containsPatterns: ["job title", "current title", "current position"],
    negativePatterns: ["company", "employer", "school"],
  },

  // ── Application answers ───────────────────────────────────────────────────────
  {
    field: "workAuthorization",
    exactPatterns: [
      "work authorization",
      "work auth",
      "authorized to work",
      "legally authorized",
      "right to work",
      "work eligibility",
      "employment eligibility",
      "visa status",
      "immigration status",
    ],
    containsPatterns: ["work authorization", "authorized to work", "legally authorized", "visa status"],
  },
  {
    field: "requiresSponsorship",
    exactPatterns: [
      "visa sponsorship",
      "require sponsorship",
      "requires sponsorship",
      "need sponsorship",
      "require visa sponsorship",
      "require work authorization",
      "sponsorship required",
      "need work authorization",
    ],
    containsPatterns: ["require sponsorship", "requires sponsorship", "visa sponsorship", "sponsorship"],
  },
  {
    field: "willingToRelocate",
    exactPatterns: [
      "willing to relocate",
      "open to relocation",
      "relocation",
      "relocate",
    ],
    containsPatterns: ["relocate", "relocation"],
  },
  {
    field: "remotePreference",
    exactPatterns: [
      "remote",
      "remote preference",
      "work preference",
      "work environment",
      "work arrangement",
      "work from home",
    ],
    containsPatterns: ["remote", "work from home"],
    negativePatterns: ["relocation"],
  },
  {
    field: "salaryExpectation",
    exactPatterns: [
      "salary expectation",
      "desired salary",
      "expected salary",
      "salary requirement",
      "compensation",
      "pay expectation",
    ],
    containsPatterns: ["salary", "compensation", "pay"],
  },
  {
    field: "noticePeriod",
    exactPatterns: [
      "notice period",
      "start date",
      "available to start",
      "earliest start date",
      "when can you start",
    ],
    containsPatterns: ["notice period", "when can you start", "available to start"],
  },
];
