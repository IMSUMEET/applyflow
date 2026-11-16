import { useEffect, useState } from "react";
import { sendMessage } from "@/messaging/sender";
import type { UserSettings } from "@/models/settings";
import { defaultSettings } from "@/models/settings";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function SettingsPanel() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_SETTINGS" });
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await sendMessage({ type: "SAVE_SETTINGS", settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure ApplyFlow behavior.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => void save()} loading={saving}>
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>

      <div className="space-y-5">
        <SettingGroup title="Autofill">
          <Toggle
            label="Enable autofill"
            description="Automatically fill recognized fields when you click Autofill."
            checked={settings.autofillEnabled}
            onChange={(v) => update("autofillEnabled", v)}
          />
          <Toggle
            label="Skip non-empty fields"
            description="Don't overwrite fields that already have a value."
            checked={settings.skipNonEmptyFields}
            onChange={(v) => update("skipNonEmptyFields", v)}
          />
        </SettingGroup>

        <SettingGroup title="Learning">
          <Toggle
            label="Enable learning"
            description="Offer to save answers to unknown questions."
            checked={settings.learningEnabled}
            onChange={(v) => update("learningEnabled", v)}
          />
          <Toggle
            label="Require approval before autofill"
            description="Always ask before filling a learned answer."
            checked={settings.requireApprovalBeforeAutoFill}
            onChange={(v) => update("requireApprovalBeforeAutoFill", v)}
          />
        </SettingGroup>

        <SettingGroup title="Digest Email">
          <Toggle
            label="Enable daily digest"
            description="Receive a daily summary of your pending referral opportunities."
            checked={settings.digestEnabled}
            onChange={(v) => update("digestEnabled", v)}
          />
          {settings.digestEnabled && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={settings.digestEmail}
                  onChange={(e) => update("digestEmail", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Delivery time
                  </label>
                  <input
                    type="time"
                    value={settings.digestTime}
                    onChange={(e) => update("digestTime", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Timezone</label>
                  <input
                    type="text"
                    value={settings.digestTimezone}
                    onChange={(e) => update("digestTimezone", e.target.value)}
                    placeholder="America/New_York"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Automatic email delivery requires backend configuration (Milestone 7). Currently,
                use the Digest preview in the Referrals panel.
              </p>
            </>
          )}
        </SettingGroup>
      </div>
    </div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          checked ? "bg-brand-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
