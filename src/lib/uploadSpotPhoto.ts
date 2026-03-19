import { supabase } from '@/integrations/supabase/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadSpotPhoto(spotId: string, file: File, _userId: string): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.error(`[uploadSpotPhoto] Invalid file type: ${file.type}`);
    return null;
  }
  if (file.size > MAX_SIZE) {
    console.error(`[uploadSpotPhoto] File too large: ${file.size} bytes`);
    return null;
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop() : file.type.split('/')[1];
  const path = `${spotId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('spot-photos').upload(path, file);
  if (error) return null;
  const { data: { publicUrl } } = supabase.storage.from('spot-photos').getPublicUrl(path);
  return publicUrl;
}
