/**
 * Cloud settings sync layer.
 * Manages reading/writing the profiles.settings JSONB column.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CustomAction, ActionsConfig } from './actionsConfig';

export interface CloudSettings {
  customActions?: CustomAction[];
  hiddenActions?: string[];
  advantageRule?: { tennis: boolean; padel: boolean };
  jerseyConfig?: Record<string, boolean>;
  defaultActionsConfig?: Record<string, any>;
}

let _cachedUserId: string | null = null;

/** Fetch settings from profiles.settings for the current user */
export async function fetchCloudSettings(userId: string): Promise<CloudSettings | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return ((data as any).settings as CloudSettings) || {};
}

/** Persist the full settings object to profiles.settings */
export async function saveCloudSettings(userId: string, settings: CloudSettings): Promise<void> {
  await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, settings: settings as any },
      { onConflict: 'user_id' }
    );
}

/** Merge a partial update into the existing cloud settings */
export async function patchCloudSettings(userId: string, patch: Partial<CloudSettings>): Promise<void> {
  const current = await fetchCloudSettings(userId) || {};
  const merged = { ...current, ...patch };
  await saveCloudSettings(userId, merged);
}

/** Get current Supabase user id (cached in memory) */
export async function getCurrentUserId(): Promise<string | null> {
  if (_cachedUserId) return _cachedUserId;
  const { data: { session } } = await supabase.auth.getSession();
  _cachedUserId = session?.user?.id ?? null;
  return _cachedUserId;
}

/** Clear cached user id (call on logout) */
export function clearCachedUserId() {
  _cachedUserId = null;
}

// Listen for auth changes to keep cache in sync
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id ?? null;
});
