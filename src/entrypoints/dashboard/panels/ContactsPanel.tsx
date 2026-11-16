import { useEffect, useState } from "react";
import { UserCheck, Plus, Trash2, Pencil } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import type { ReferralContact } from "@/models/referral";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  linkedinUrl: string;
  notes: string;
}

const emptyForm: ContactFormData = { name: "", company: "", email: "", linkedinUrl: "", notes: "" };

export function ContactsPanel() {
  const [contacts, setContacts] = useState<ReferralContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ReferralContact | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_REFERRAL_CONTACTS" });
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(contact: ReferralContact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      company: contact.company,
      email: contact.email ?? "",
      linkedinUrl: contact.linkedinUrl ?? "",
      notes: contact.notes ?? "",
    });
    setShowForm(true);
  }

  async function saveContact() {
    if (!form.name.trim() || !form.company.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated: ReferralContact = {
          ...editing,
          ...form,
          updatedAt: new Date().toISOString(),
        };
        await sendMessage({ type: "UPDATE_REFERRAL_CONTACT", contact: updated });
        setContacts((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await sendMessage({
          type: "SAVE_REFERRAL_CONTACT",
          contact: { ...form },
        });
        setContacts((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    await sendMessage({ type: "DELETE_REFERRAL_CONTACT", contactId: id });
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} referral contacts.</p>
        </div>
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">
            {editing ? "Edit Contact" : "New Contact"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Name *"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Field
              label="Company *"
              value={form.company}
              onChange={(v) => setForm((f) => ({ ...f, company: v }))}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            />
            <Field
              label="LinkedIn URL"
              value={form.linkedinUrl}
              onChange={(v) => setForm((f) => ({ ...f, linkedinUrl: v }))}
            />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" size="sm" onClick={() => void saveContact()} loading={saving}>
              {editing ? "Save Changes" : "Create Contact"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <UserCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No contacts yet</h3>
          <p className="text-gray-400 text-sm mt-1">Add people who can refer you to jobs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                <p className="text-gray-500 text-sm">{contact.company}</p>
                {contact.email && (
                  <p className="text-gray-400 text-xs">{contact.email}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(contact)}
                  className="text-gray-400 hover:text-brand-600 transition-colors"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void deleteContact(contact.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
