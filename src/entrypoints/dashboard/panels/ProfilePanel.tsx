import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ChevronDown, Check, Briefcase, GraduationCap } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import type { UserProfile, EducationEntry, EmploymentEntry } from "@/models/profile";
import { emptyProfile } from "@/models/profile";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { generateId } from "@/utils/id";
import { RESUME_BASE, RESUME_EMPLOYMENT, RESUME_EDUCATION } from "@/data/resumeDefaults";
import {
  COUNTRIES,
  DEGREE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  MONTHS,
  WORK_AUTHORIZATION_OPTIONS,
  getStatesForCountry,
  getYearOptions,
  parseDateParts,
  buildDate,
} from "@/data/profileOptions";

const YEARS = getYearOptions();

// ── Top-level panel ────────────────────────────────────────────────────────────

export function ProfilePanel() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_PROFILE" });
      // Seed from resume for any fields that are still empty
      const merged: UserProfile = {
        ...emptyProfile(),
        ...Object.fromEntries(
          Object.entries(RESUME_BASE).filter(([, v]) => v !== "" && v !== undefined)
        ),
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => {
            if (Array.isArray(v)) return v.length > 0;
            return v !== "" && v !== undefined && v !== null;
          })
        ),
        employment: data.employment.some((e) => e.company.trim()) ? data.employment : RESUME_EMPLOYMENT,
        education: data.education.some((e) => e.institution.trim()) ? data.education : RESUME_EDUCATION,
      };
      setProfile(merged);
    } finally {
      setLoading(false);
    }
  }

  // Auto-save 1.5 s after last change
  function handleChange(updated: UserProfile) {
    setProfile(updated);
    setSaveState("idle");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => void persist(updated), 1500);
  }

  async function persist(data: UserProfile) {
    setSaveState("saving");
    try {
      await sendMessage({ type: "SAVE_PROFILE", profile: data });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  }

  function up<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    handleChange({ ...profile, [key]: value });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Used to autofill job applications. Saved automatically as you type.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {saveState === "saving" && (
            <span className="text-gray-400 flex items-center gap-1">
              <Spinner size="sm" /> Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            loading={saveState === "saving"}
            onClick={() => void persist(profile)}
          >
            Save Profile
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Personal Information ────────────────────────────────────────────── */}
        <Section title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" value={profile.firstName} onChange={(v) => up("firstName", v)} />
            <Field label="Last Name *" value={profile.lastName} onChange={(v) => up("lastName", v)} />
            <Field label="Preferred Name" value={profile.preferredName ?? ""} onChange={(v) => up("preferredName", v)} placeholder="What you go by" />
            <Field label="Email *" value={profile.email} type="email" onChange={(v) => up("email", v)} />
            <Field label="Phone" value={profile.phone} type="tel" onChange={(v) => up("phone", v)} placeholder="+1 (555) 000-0000" />
          </div>
        </Section>

        {/* ── Location ────────────────────────────────────────────────────────── */}
        <Section title="Location">
          <div className="grid grid-cols-2 gap-4">
            {/* Country */}
            <SelectField
              label="Country"
              value={profile.country}
              onChange={(v) => {
                up("country", v);
                // Reset state when country changes
                handleChange({ ...profile, country: v, state: "" });
              }}
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              placeholder="Select country"
            />

            {/* State — select for US/CA/AU/UK, text otherwise */}
            <StateField
              country={profile.country}
              value={profile.state}
              onChange={(v) => up("state", v)}
            />

            <Field label="City" value={profile.city} onChange={(v) => up("city", v)} placeholder="e.g. Seattle" />
            <Field label="Postal Code" value={profile.postalCode} onChange={(v) => up("postalCode", v)} placeholder="e.g. 98101" />
          </div>
        </Section>

        {/* ── Professional Links ───────────────────────────────────────────────── */}
        <Section title="Professional Links">
          <div className="grid grid-cols-2 gap-4">
            <Field label="LinkedIn URL" value={profile.linkedinUrl} type="url" onChange={(v) => up("linkedinUrl", v)} placeholder="https://linkedin.com/in/you" />
            <Field label="GitHub URL" value={profile.githubUrl} type="url" onChange={(v) => up("githubUrl", v)} placeholder="https://github.com/you" />
            <Field label="Portfolio URL" value={profile.portfolioUrl} type="url" onChange={(v) => up("portfolioUrl", v)} placeholder="https://yoursite.com" className="col-span-2" />
          </div>
        </Section>

        {/* ── Professional Summary ─────────────────────────────────────────────── */}
        <Section title="Professional Summary">
          <textarea
            value={profile.summary}
            onChange={(e) => up("summary", e.target.value)}
            rows={4}
            placeholder="A short bio used to fill 'About Me' and 'Cover Letter' fields on applications…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </Section>

        {/* ── Work Experience ───────────────────────────────────────────────────── */}
        <Section
          title="Work Experience"
          icon={<Briefcase className="h-4 w-4 text-gray-400" />}
          action={
            <button
              onClick={() => {
                const entry: EmploymentEntry = {
                  id: generateId(),
                  company: "",
                  title: "",
                  employmentType: "full-time",
                  startDate: "",
                  current: true,
                  remote: false,
                };
                handleChange({ ...profile, employment: [entry, ...profile.employment] });
              }}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> Add Position
            </button>
          }
        >
          {profile.employment.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No positions added yet — click "Add Position" above.
            </p>
          ) : (
            <div className="space-y-4">
              {profile.employment.map((entry, i) => (
                <EmploymentCard
                  key={entry.id}
                  entry={entry}
                  onChange={(updated) => {
                    const next = profile.employment.map((e, idx) => idx === i ? updated : e);
                    handleChange({ ...profile, employment: next });
                  }}
                  onDelete={() => {
                    handleChange({ ...profile, employment: profile.employment.filter((_, idx) => idx !== i) });
                  }}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Education ─────────────────────────────────────────────────────────── */}
        <Section
          title="Education"
          icon={<GraduationCap className="h-4 w-4 text-gray-400" />}
          action={
            <button
              onClick={() => {
                const entry: EducationEntry = {
                  id: generateId(),
                  institution: "",
                  degree: "",
                  fieldOfStudy: "",
                  startDate: "",
                  current: false,
                };
                handleChange({ ...profile, education: [entry, ...profile.education] });
              }}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> Add Education
            </button>
          }
        >
          {profile.education.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No education added yet — click "Add Education" above.
            </p>
          ) : (
            <div className="space-y-4">
              {profile.education.map((entry, i) => (
                <EducationCard
                  key={entry.id}
                  entry={entry}
                  onChange={(updated) => {
                    const next = profile.education.map((e, idx) => idx === i ? updated : e);
                    handleChange({ ...profile, education: next });
                  }}
                  onDelete={() => {
                    handleChange({ ...profile, education: profile.education.filter((_, idx) => idx !== i) });
                  }}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Application Preferences ───────────────────────────────────────────── */}
        <Section title="Application Preferences">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Work Authorization"
              value={profile.workAuthorization}
              onChange={(v) => up("workAuthorization", v)}
              options={WORK_AUTHORIZATION_OPTIONS}
              placeholder="Select status"
            />
            <SelectField
              label="Requires Visa Sponsorship?"
              value={
                profile.requiresSponsorship === undefined ? ""
                  : profile.requiresSponsorship ? "yes" : "no"
              }
              onChange={(v) =>
                up("requiresSponsorship", v === "" ? undefined : v === "yes")
              }
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              placeholder="Select…"
            />
            <SelectField
              label="Willing to Relocate?"
              value={
                profile.willingToRelocate === undefined ? ""
                  : profile.willingToRelocate ? "yes" : "no"
              }
              onChange={(v) =>
                up("willingToRelocate", v === "" ? undefined : v === "yes")
              }
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              placeholder="Select…"
            />
            <SelectField
              label="Work Preference"
              value={profile.remotePreference ?? ""}
              onChange={(v) =>
                up("remotePreference", v === "" ? undefined : v as UserProfile["remotePreference"])
              }
              options={[
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "On-site" },
                { value: "flexible", label: "Flexible" },
              ]}
              placeholder="Select…"
            />
            <Field
              label="Desired Salary"
              value={profile.salaryExpectation ?? ""}
              onChange={(v) => up("salaryExpectation", v || undefined)}
              placeholder="e.g. $120,000"
            />
            <Field
              label="Notice Period / Availability"
              value={profile.noticePeriod ?? ""}
              onChange={(v) => up("noticePeriod", v || undefined)}
              placeholder="e.g. 2 weeks, Immediate"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Employment card ────────────────────────────────────────────────────────────

function EmploymentCard({
  entry,
  onChange,
  onDelete,
}: {
  entry: EmploymentEntry;
  onChange: (e: EmploymentEntry) => void;
  onDelete: () => void;
}) {
  function up<K extends keyof EmploymentEntry>(key: K, value: EmploymentEntry[K]) {
    onChange({ ...entry, [key]: value });
  }

  const startParts = parseDateParts(entry.startDate);
  const endParts = parseDateParts(entry.endDate ?? "");

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Company *"
          value={entry.company}
          onChange={(v) => up("company", v)}
          placeholder="e.g. Google"
        />
        <Field
          label="Job Title *"
          value={entry.title}
          onChange={(v) => up("title", v)}
          placeholder="e.g. Software Engineer"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Employment Type"
          value={entry.employmentType}
          onChange={(v) => up("employmentType", v as EmploymentEntry["employmentType"])}
          options={EMPLOYMENT_TYPE_OPTIONS}
        />
        <Field
          label="Location"
          value={entry.location ?? ""}
          onChange={(v) => up("location", v || undefined)}
          placeholder="City, State or Remote"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date</label>
          <div className="flex gap-2">
            <MonthSelect
              value={startParts.month}
              onChange={(m) => up("startDate", buildDate(startParts.year, m))}
            />
            <YearSelect
              value={startParts.year}
              onChange={(y) => up("startDate", buildDate(y, startParts.month))}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600">End Date</label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={entry.current}
                onChange={(e) => up("current", e.target.checked)}
                className="rounded"
              />
              Present
            </label>
          </div>
          {entry.current ? (
            <div className="flex items-center h-9 px-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700 font-medium">
              Currently working here
            </div>
          ) : (
            <div className="flex gap-2">
              <MonthSelect
                value={endParts.month}
                onChange={(m) => up("endDate", buildDate(endParts.year, m) || undefined)}
              />
              <YearSelect
                value={endParts.year}
                onChange={(y) => up("endDate", buildDate(y, endParts.month) || undefined)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Remote + delete */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={entry.remote}
            onChange={(e) => up("remote", e.target.checked)}
            className="rounded"
          />
          Remote position
        </label>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors"
          aria-label="Remove position"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Description — bullet editor */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <BulletEditor
          value={entry.description ?? ""}
          onChange={(v) => up("description", v || undefined)}
        />
      </div>
    </div>
  );
}

// ── Education card ─────────────────────────────────────────────────────────────

function EducationCard({
  entry,
  onChange,
  onDelete,
}: {
  entry: EducationEntry;
  onChange: (e: EducationEntry) => void;
  onDelete: () => void;
}) {
  function up<K extends keyof EducationEntry>(key: K, value: EducationEntry[K]) {
    onChange({ ...entry, [key]: value });
  }

  const startParts = parseDateParts(entry.startDate);
  const endParts = parseDateParts(entry.endDate ?? "");

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="School / University *"
          value={entry.institution}
          onChange={(v) => up("institution", v)}
          placeholder="e.g. Stanford University"
        />
        <SelectField
          label="Degree"
          value={entry.degree}
          onChange={(v) => up("degree", v)}
          options={DEGREE_OPTIONS.map((d) => ({ value: d, label: d }))}
          placeholder="Select degree"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Field of Study"
          value={entry.fieldOfStudy}
          onChange={(v) => up("fieldOfStudy", v)}
          placeholder="e.g. Computer Science"
        />
        <Field
          label="GPA"
          value={entry.gpa ?? ""}
          onChange={(v) => up("gpa", v || undefined)}
          placeholder="e.g. 3.8"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date</label>
          <div className="flex gap-2">
            <MonthSelect
              value={startParts.month}
              onChange={(m) => up("startDate", buildDate(startParts.year, m))}
            />
            <YearSelect
              value={startParts.year}
              onChange={(y) => up("startDate", buildDate(y, startParts.month))}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600">End Date</label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={entry.current}
                onChange={(e) => up("current", e.target.checked)}
                className="rounded"
              />
              Enrolled
            </label>
          </div>
          {entry.current ? (
            <div className="flex items-center h-9 px-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700 font-medium">
              Currently enrolled
            </div>
          ) : (
            <div className="flex gap-2">
              <MonthSelect
                value={endParts.month}
                onChange={(m) => up("endDate", buildDate(endParts.year, m) || undefined)}
              />
              <YearSelect
                value={endParts.year}
                onChange={(y) => up("endDate", buildDate(y, endParts.month) || undefined)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors"
          aria-label="Remove education"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Bullet editor ──────────────────────────────────────────────────────────────

function BulletEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Store as "\n"-separated lines; filter blank lines for display but preserve order
  const bullets = value ? value.split("\n") : [""];
  const displayBullets = bullets.length > 0 ? bullets : [""];

  function updateBullet(index: number, text: string) {
    const updated = [...displayBullets];
    updated[index] = text;
    onChange(updated.join("\n"));
  }

  function removeBullet(index: number) {
    const updated = displayBullets.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated.join("\n") : "");
  }

  function addBullet() {
    onChange([...displayBullets, ""].join("\n"));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Insert new bullet after current
      const updated = [...displayBullets];
      updated.splice(index + 1, 0, "");
      onChange(updated.join("\n"));
      // Focus next bullet after render
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(`[data-bullet-index="${index + 1}"]`);
        inputs[0]?.focus();
      }, 0);
    }
    if (e.key === "Backspace" && displayBullets[index] === "" && displayBullets.length > 1) {
      e.preventDefault();
      removeBullet(index);
    }
  }

  return (
    <div className="space-y-1.5">
      {displayBullets.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className="text-brand-400 font-bold text-sm mt-2 w-3 shrink-0 select-none">•</span>
          <input
            type="text"
            value={bullet}
            data-bullet-index={i}
            onChange={(e) => updateBullet(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            placeholder="Describe what you built, the impact, the tech…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {displayBullets.length > 1 && (
            <button
              onClick={() => removeBullet(i)}
              className="text-gray-200 hover:text-red-400 transition-colors mt-1.5 opacity-0 group-hover:opacity-100 shrink-0"
              aria-label="Remove bullet"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addBullet}
        className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 font-medium mt-1 pl-5"
      >
        <Plus className="h-3 w-3" /> Add bullet
      </button>
    </div>
  );
}

// ── Shared form primitives ─────────────────────────────────────────────────────

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function StateField({
  country,
  value,
  onChange,
}: {
  country: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const states = getStatesForCountry(country);

  if (states) {
    return (
      <SelectField
        label="State / Province"
        value={value}
        onChange={onChange}
        options={states.map((s) => ({ value: s.name, label: s.name }))}
        placeholder="Select state"
      />
    );
  }

  return (
    <Field
      label="State / Province / Region"
      value={value}
      onChange={onChange}
      placeholder="e.g. Bayern"
    />
  );
}

function MonthSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-200 rounded-lg px-2 py-2 pr-6 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

function YearSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-200 rounded-lg px-2 py-2 pr-6 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
    </div>
  );
}
