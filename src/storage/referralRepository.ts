import type { ReferralContact, ReferralAssignment } from "@/models/referral";
import { ReferralContactSchema, ReferralAssignmentSchema } from "@/models/referral";
import { storageGet, storageSet } from "./chromeStorage";
import { generateId } from "@/utils/id";

const CONTACTS_KEY = "referralContacts";
const ASSIGNMENTS_KEY = "referralAssignments";

async function loadContacts(): Promise<ReferralContact[]> {
  const raw = await storageGet<unknown[]>(CONTACTS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = ReferralContactSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

async function loadAssignments(): Promise<ReferralAssignment[]> {
  const raw = await storageGet<unknown[]>(ASSIGNMENTS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = ReferralAssignmentSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

export const referralRepository = {
  contacts: {
    async findAll(): Promise<ReferralContact[]> {
      return loadContacts();
    },

    async getById(id: string): Promise<ReferralContact | null> {
      const contacts = await loadContacts();
      return contacts.find((c) => c.id === id) ?? null;
    },

    async create(
      data: Omit<ReferralContact, "id" | "createdAt" | "updatedAt">
    ): Promise<ReferralContact> {
      const contacts = await loadContacts();
      const now = new Date().toISOString();
      const contact: ReferralContact = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await storageSet(CONTACTS_KEY, [...contacts, contact]);
      return contact;
    },

    async update(contact: ReferralContact): Promise<void> {
      const contacts = await loadContacts();
      const updated = contacts.map((c) =>
        c.id === contact.id
          ? { ...contact, updatedAt: new Date().toISOString() }
          : c
      );
      await storageSet(CONTACTS_KEY, updated);
    },

    async delete(id: string): Promise<void> {
      const contacts = await loadContacts();
      await storageSet(
        CONTACTS_KEY,
        contacts.filter((c) => c.id !== id)
      );
    },

    async findByCompany(company: string): Promise<ReferralContact[]> {
      const contacts = await loadContacts();
      const q = company.toLowerCase();
      return contacts.filter((c) => c.company.toLowerCase().includes(q));
    },
  },

  assignments: {
    async findAll(): Promise<ReferralAssignment[]> {
      return loadAssignments();
    },

    async findByJob(jobId: string): Promise<ReferralAssignment[]> {
      const assignments = await loadAssignments();
      return assignments.filter((a) => a.jobId === jobId);
    },

    async findByContact(contactId: string): Promise<ReferralAssignment[]> {
      const assignments = await loadAssignments();
      return assignments.filter((a) => a.contactId === contactId);
    },

    async create(
      data: Omit<ReferralAssignment, "id" | "createdAt" | "updatedAt">
    ): Promise<ReferralAssignment> {
      const assignments = await loadAssignments();
      const now = new Date().toISOString();
      const assignment: ReferralAssignment = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await storageSet(ASSIGNMENTS_KEY, [...assignments, assignment]);
      return assignment;
    },

    async update(assignment: ReferralAssignment): Promise<void> {
      const assignments = await loadAssignments();
      const updated = assignments.map((a) =>
        a.id === assignment.id
          ? { ...assignment, updatedAt: new Date().toISOString() }
          : a
      );
      await storageSet(ASSIGNMENTS_KEY, updated);
    },

    async delete(id: string): Promise<void> {
      const assignments = await loadAssignments();
      await storageSet(
        ASSIGNMENTS_KEY,
        assignments.filter((a) => a.id !== id)
      );
    },
  },
};
