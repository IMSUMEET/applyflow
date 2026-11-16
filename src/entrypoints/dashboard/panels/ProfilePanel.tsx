import { useEffect, useState } from "react";
import { sendMessage } from "@/messaging/sender";
import type { UserProfile } from "@/models/profile";
import { emptyProfile } from "@/models/profile";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function ProfilePanel() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_PROFILE" });
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await sendMessage({ type: "SAVE_PROFILE", profile });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            This information is used to autofill job applications.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => void save()} loading={saving}>
          {saved ? "Saved!" : "Save Profile"}
        </Button>
      </div>

      <div className="space-y-6">
        <Section title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={profile.firstName} onChange={(v) => update("firstName", v)} />
            <Field label="Last Name" value={profile.lastName} onChange={(v) => update("lastName", v)} />
            <Field label="Preferred Name" value={profile.preferredName ?? ""} onChange={(v) => update("preferredName", v)} />
            <Field label="Email" value={profile.email} type="email" onChange={(v) => update("email", v)} />
            <Field label="Phone" value={profile.phone} type="tel" onChange={(v) => update("phone", v)} />
          </div>
        </Section>

        <Section title="Location">
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" value={profile.city} onChange={(v) => update("city", v)} />
            <Field label="State / Province" value={profile.state} onChange={(v) => update("state", v)} />
            <Field label="Country" value={profile.country} onChange={(v) => update("country", v)} />
            <Field label="Postal Code" value={profile.postalCode} onChange={(v) => update("postalCode", v)} />
          </div>
        </Section>

        <Section title="Professional Links">
          <div className="grid grid-cols-2 gap-4">
            <Field label="LinkedIn URL" value={profile.linkedinUrl} onChange={(v) => update("linkedinUrl", v)} />
            <Field label="GitHub URL" value={profile.githubUrl} onChange={(v) => update("githubUrl", v)} />
            <Field label="Portfolio URL" value={profile.portfolioUrl} onChange={(v) => update("portfolioUrl", v)} />
            <Field label="Website URL" value={profile.websiteUrl} onChange={(v) => update("websiteUrl", v)} />
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Professional Summary</label>
            <textarea
              value={profile.summary}
              onChange={(e) => update("summary", e.target.value)}
              rows={4}
              placeholder="Brief professional summary..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </Section>

        <Section title="Work Authorization">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Work Authorization Status"
              value={profile.workAuthorization}
              onChange={(v) => update("workAuthorization", v)}
              placeholder="e.g. US Citizen, H1-B, OPT..."
            />
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Requires Visa Sponsorship?
              </label>
              <select
                value={
                  profile.requiresSponsorship === undefined
                    ? ""
                    : profile.requiresSponsorship
                    ? "yes"
                    : "no"
                }
                onChange={(e) =>
                  update(
                    "requiresSponsorship",
                    e.target.value === "" ? undefined : e.target.value === "yes"
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Not specified</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">{title}</h2>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
