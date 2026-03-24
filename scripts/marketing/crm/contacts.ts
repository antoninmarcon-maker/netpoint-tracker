import { supabase, type Segment } from "../config";

// ── Types ───────────────────────────────────────────────────

type ContactStatus = "new" | "contacted" | "replied" | "converted" | "ignored";
type Platform = "instagram" | "tiktok";
type InteractionType = "dm" | "comment" | "follow" | "like" | "mention";

interface Contact {
  id: string;
  name: string;
  handle_ig: string | null;
  handle_tiktok: string | null;
  segment: Segment;
  source: string | null;
  status: ContactStatus;
  city: string | null;
  club_name: string | null;
  followers_count: number | null;
  bio: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactInsert {
  name: string;
  segment: Segment;
  handle_ig?: string;
  handle_tiktok?: string;
  source?: string;
  status?: ContactStatus;
  city?: string;
  club_name?: string;
  followers_count?: number;
  bio?: string;
  notes?: string;
}

interface InteractionInsert {
  platform: Platform;
  type: InteractionType;
  message_sent?: string;
  response?: string;
  sent_at?: string;
  responded_at?: string;
}

interface ListFilters {
  segment?: Segment;
  status?: ContactStatus;
  search?: string;
}

interface CrmStats {
  bySegment: Record<string, number>;
  byStatus: Record<string, number>;
  total: number;
}

// ── Helpers ─────────────────────────────────────────────────

function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

// ── CRUD ────────────────────────────────────────────────────

export async function listContacts(filters: ListFilters = {}): Promise<Contact[]> {
  let query = supabase
    .from("marketing_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.segment) query = query.eq("segment", filters.segment);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,handle_ig.ilike.%${filters.search}%,handle_tiktok.ilike.%${filters.search}%,club_name.ilike.%${filters.search}%`
    );
  }

  return unwrap<Contact[]>(await query);
}

export async function addContact(data: ContactInsert): Promise<Contact> {
  const result = await supabase
    .from("marketing_contacts")
    .insert(data)
    .select()
    .single();

  return unwrap<Contact>(result);
}

export async function updateContact(
  id: string,
  data: Partial<ContactInsert>
): Promise<Contact> {
  const result = await supabase
    .from("marketing_contacts")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  return unwrap<Contact>(result);
}

export async function getContactsBySegment(segment: Segment): Promise<Contact[]> {
  return listContacts({ segment });
}

export async function markContacted(
  contactId: string,
  interaction: InteractionInsert
): Promise<Contact> {
  const { error: interactionError } = await supabase
    .from("marketing_interactions")
    .insert({ contact_id: contactId, ...interaction });

  if (interactionError) throw interactionError;

  return updateContact(contactId, { status: "contacted" });
}

export async function getStats(): Promise<CrmStats> {
  const contacts = unwrap<Pick<Contact, "segment" | "status">[]>(
    await supabase.from("marketing_contacts").select("segment, status")
  );

  const bySegment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const c of contacts) {
    bySegment[c.segment] = (bySegment[c.segment] ?? 0) + 1;
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  return { bySegment, byStatus, total: contacts.length };
}
