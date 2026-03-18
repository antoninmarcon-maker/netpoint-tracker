import { supabase } from '@/integrations/supabase/client';

export async function uploadSpotPhoto(spotId: string, file: File, userId: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${spotId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('spot-photos').upload(path, file);
  if (error) return null;
  const { data: { publicUrl } } = supabase.storage.from('spot-photos').getPublicUrl(path);
  return publicUrl;
}
